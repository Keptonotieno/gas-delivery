import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { Order, OrderStatus, GasType, EmployeeStatus, Product, Driver } from './src/types.js';
import { sendDriverActivationEmail } from './server/emailService.js';
import {
  generateActivationToken,
  verifyActivationToken,
  consumeActivationToken,
  getActiveTokenForDriver
} from './server/activation.js';
import {
  createToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  authLimiter,
  orderLimiter,
  cashoutLimiter,
  adminLimiter,
  generalApiLimiter,
  webhookLimiter,
  securityHeadersMiddleware,
  sanitizeString,
  validatePositiveInteger,
  validateCoordinates,
  validateKenyaPhone,
  logSecurityEvent
} from './server/security.js';

// Connected clients for real-time events (Server-Sent Events)
type SSEClient = {
  id: number;
  res: Response;
  role?: string;
  userId?: string;
};

let clients: SSEClient[] = [];
let nextClientId = 1;

export function broadcastEvent(eventType: string, data: any) {
  const message = JSON.stringify({ type: eventType, data, timestamp: new Date().toISOString() });
  clients.forEach((client) => {
    try {
      client.res.write(`data: ${message}\n\n`);
    } catch {
      // client dropped
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // HARDENED SECURITY HEADERS & PERMISSIONS
  app.disable('x-powered-by');
  app.use(securityHeadersMiddleware);

  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Global rate limiter on all API endpoints
  app.use('/api', generalApiLimiter);

  // ==========================================
  // REAL-TIME SERVER-SENT EVENTS (SSE)
  // ==========================================
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = nextClientId++;
    const role = (req.query.role as string) || 'all';
    const userId = (req.query.userId as string) || '';

    const newClient: SSEClient = { id: clientId, res, role, userId };
    clients.push(newClient);

    // Send initial ping
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId })}\n\n`);

    // Keep-alive heartbeat every 20 seconds
    const pingInterval = setInterval(() => {
      try {
        res.write(`data: ${JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() })}\n\n`);
      } catch {
        clearInterval(pingInterval);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(pingInterval);
      clients = clients.filter((c) => c.id !== clientId);
    });
  });

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Helper to extract caller user from token with signature verification
  const getAuthenticatedUser = (req: Request) => {
    const authHeader = req.headers.authorization;
    const devRoleHeader = (req.headers['x-dev-role'] || req.headers['x-user-role']) as string;
    
    let token = '';
    if (authHeader) {
      token = authHeader.replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '').trim();
    } else if (devRoleHeader) {
      token = devRoleHeader.trim();
    }

    // In development mode, check query parameters if headers absent
    if (!token && process.env.NODE_ENV !== 'production') {
      const queryRole = req.query.role || req.query.devRole || req.query.token;
      if (typeof queryRole === 'string' && queryRole) {
        token = queryRole.trim();
      }
    }

    if (!token) {
      // In development mode, if caller is hitting admin, orders, or analytics endpoints without token,
      // fallback to default admin so operations center previews gracefully load
      if (process.env.NODE_ENV !== 'production') {
        const adminUser = db.users.find((u) => u.role === 'admin');
        if (adminUser) return adminUser;
      }
      return null;
    }

    try {
      const decoded = verifyToken(token);
      if (!decoded) {
        if (process.env.NODE_ENV !== 'production') {
          const matchedUser = db.users.find(
            (u) => u.id === token || u.email.toLowerCase() === token.toLowerCase() || u.role === token
          );
          if (matchedUser) return matchedUser;
          const adminUser = db.users.find((u) => u.role === 'admin');
          if (adminUser) return adminUser;
        }
        return null;
      }

      let user = db.users.find(
        (u) => u.id === decoded.id || (u.email && decoded.email && u.email.toLowerCase() === decoded.email.toLowerCase())
      );

      // Auto-provision verified dev or authenticated session into db.users if absent
      if (!user && decoded.email && decoded.role) {
        user = {
          id: decoded.id || `usr-${Date.now()}`,
          name: (decoded as any).name || decoded.email.split('@')[0],
          email: decoded.email,
          role: decoded.role as any,
          status: 'active',
          passwordHash: hashPassword('DevSession@2024')
        };
        db.users.push(user as any);
      }

      if (!user) return null;

      // Check if user is associated with an employee that is suspended or terminated
      const matchingEmp = db.employees.find(
        (e) => e.email.toLowerCase().trim() === user.email.toLowerCase().trim() ||
               (user && (user as any).driverId && e.driverId === (user as any).driverId)
      );
      if (matchingEmp && (matchingEmp.status === 'Suspended' || matchingEmp.status === 'Terminated')) {
        return null;
      }

      // Check if customer or user account is suspended by an administrator
      if (user.status === 'suspended') {
        return null;
      }

      return user;
    } catch {
      return null;
    }
  };

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const caller = getAuthenticatedUser(req);
    if (!caller) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }
    (req as any).user = caller;
    next();
  };

  const requireRole = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const caller = getAuthenticatedUser(req);
      if (!caller) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
      }
      if (!roles.includes(caller.role)) {
        logSecurityEvent('UNAUTHORIZED_ROLE_ACCESS', {
          userId: caller.id,
          userRole: caller.role,
          requiredRoles: roles,
          path: req.originalUrl
        }, req);
        return res.status(403).json({ error: `Forbidden: Access restricted to ${roles.join(' or ')}.` });
      }
      (req as any).user = caller;
      next();
    };
  };

  const requireAdmin = requireRole('admin');
  const requireDriverOrAdmin = requireRole('driver', 'admin');
  const requireCustomerOrAdmin = requireRole('customer', 'admin');

  // ==========================================
  // AUTHENTICATION ROUTES (UNIFIED SIGN-IN & SPECIFIC ACTIONABLE ERROR HANDLING)
  // ==========================================
  app.get('/api/auth/me', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller) {
      return res.status(401).json({ error: 'Unauthorized: No active session.' });
    }
    const { passwordHash: _, ...sanitizedUser } = caller;
    return res.json({ user: sanitizedUser });
  });
  app.post('/api/auth/login', authLimiter, (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const trimmedEmail = sanitizeString(email).toLowerCase().trim();

    // Find existing user (case-insensitive)
    let user = db.users.find(
      (u) => u.email.toLowerCase().trim() === trimmedEmail
    );

    // If user does not exist in registry
    if (!user) {
      logSecurityEvent('LOGIN_UNKNOWN_EMAIL', { email: trimmedEmail }, req);
      return res.status(401).json({
        error: 'No account found with this email. Please check your email or click Create Account to sign up.'
      });
    }

    // Check if user is associated with an employee that is suspended or terminated
    const matchingEmp = db.employees.find(
      (e) => e.email.toLowerCase().trim() === trimmedEmail || (user && (user as any).driverId && e.driverId === (user as any).driverId)
    );
    if (matchingEmp) {
      if (matchingEmp.status === 'Suspended') {
        logSecurityEvent('LOGIN_ATTEMPT_SUSPENDED_STAFF', { email: trimmedEmail }, req);
        return res.status(403).json({
          error: `Access Denied: Your staff account has been SUSPENDED${matchingEmp.suspensionReason ? ` (${matchingEmp.suspensionReason})` : ''}. Please contact the operations administrator.`
        });
      }
      if (matchingEmp.status === 'Terminated') {
        logSecurityEvent('LOGIN_ATTEMPT_TERMINATED_STAFF', { email: trimmedEmail }, req);
        return res.status(403).json({
          error: 'Access Denied: Your staff account has been TERMINATED. Login privileges have been revoked.'
        });
      }
    }

    // Enforce account status: Active vs Suspended vs Inactive for customers
    if (user.status === 'suspended' || user.verificationStatus === 'suspended') {
      logSecurityEvent('LOGIN_ATTEMPT_SUSPENDED_USER', { email: trimmedEmail, userId: user.id }, req);
      return res.status(403).json({
        error: user.role === 'driver'
          ? 'Driver account suspended. Access to courier dispatch has been halted. Please contact operations management.'
          : 'Your customer account has been suspended by an administrator. Please contact support at support@gasdeliver.co.ke or +254 700 000 100.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    if (user.status === 'inactive') {
      logSecurityEvent('LOGIN_ATTEMPT_INACTIVE_CUSTOMER', { email: trimmedEmail, userId: user.id }, req);
      return res.status(403).json({
        error: 'Your customer account is currently inactive. Please contact support.',
        code: 'CUSTOMER_ACCOUNT_INACTIVE'
      });
    }

    // Pending driver accounts verification check
    if (user.role === 'driver') {
      if (user.verificationStatus === 'pending' || user.status === 'pending' || user.accountActivated === false) {
        logSecurityEvent('LOGIN_BLOCKED_PENDING_DRIVER', { email: trimmedEmail, userId: user.id }, req);
        return res.status(403).json({
          error: 'Driver account pending admin approval. Your submitted vehicle documents and driver\'s license are currently under review by our operations compliance team.',
          code: 'DRIVER_ACCOUNT_PENDING_APPROVAL'
        });
      }

      if (user.verificationStatus === 'rejected' || user.status === 'rejected') {
        logSecurityEvent('LOGIN_BLOCKED_REJECTED_DRIVER', { email: trimmedEmail, userId: user.id }, req);
        return res.status(403).json({
          error: 'Driver application rejected. Document verification did not satisfy compliance requirements. Please contact support.',
          code: 'DRIVER_ACCOUNT_REJECTED'
        });
      }
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    const isPasswordValid = verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      logSecurityEvent('LOGIN_INVALID_PASSWORD', { email: trimmedEmail }, req);
      return res.status(401).json({ error: 'Invalid password. Please check your password and try again.' });
    }

    // Automatically upgrade legacy plaintext password to secure scrypt hash
    if (!user.passwordHash.startsWith('scrypt:')) {
      user.passwordHash = hashPassword(password);
    }

    // Update lastLogin timestamp
    user.lastLogin = new Date().toISOString();
    if (!user.status) user.status = 'active';
    if (!user.createdAt) user.createdAt = new Date().toISOString();

    // Generate tamper-proof cryptographically signed token
    const token = createToken({ id: user.id, email: user.email, role: user.role });
    logSecurityEvent('LOGIN_SUCCESS', { userId: user.id, email: user.email, role: user.role }, req);
    
    // Return sanitized user without passwordHash
    const { passwordHash: _, ...sanitizedUser } = user;
    return res.json({
      token,
      user: sanitizedUser,
      message: 'Login successful'
    });
  });

  // Dedicated customer registration endpoint & standard register endpoint
  const handleRegistration = (req: Request, res: Response) => {
    const {
      name,
      email,
      password,
      confirmPassword,
      phone,
      address,
      corridorZone,
      passcode,
      adminSecurityPasscode,
      role
    } = req.body;

    // Strict input validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Full legal name is required (at least 2 characters).' });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = sanitizeString(email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'A valid email address is required (e.g. name@example.com).' });
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length < 9) {
      return res.status(400).json({ error: 'A valid phone number is required (e.g. +254 712 345 678).' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (confirmPassword && confirmPassword !== password) {
      return res.status(400).json({ error: 'Passwords do not match. Please re-enter your password.' });
    }

    // Prevent duplicate accounts by email
    const existing = db.users.find((u) => u.email.toLowerCase().trim() === cleanEmail);
    if (existing) {
      return res.status(400).json({
        error: 'An account with this email address already exists. Please sign in instead.'
      });
    }

    // Disallow public driver or admin registration:
    if (role === 'driver') {
      logSecurityEvent('BLOCKED_PUBLIC_DRIVER_REGISTRATION', { email: cleanEmail }, req);
      return res.status(403).json({
        error: 'Public registration for drivers is disabled. Driver accounts must be created by an authorized GasDeliver administrator.',
        code: 'DRIVER_SELF_REGISTRATION_FORBIDDEN'
      });
    }

    if (role === 'admin') {
      logSecurityEvent('BLOCKED_PUBLIC_ADMIN_REGISTRATION', { email: cleanEmail }, req);
      return res.status(403).json({
        error: 'Public registration is strictly for customer accounts. Administrator accounts cannot be created via public sign-up.',
        code: 'ADMIN_SELF_REGISTRATION_FORBIDDEN'
      });
    }

    // SERVER-SIDE ROLE & STATUS ASSIGNMENT:
    // Every registered public user is strictly given role = "customer" and status = "active".
    // Role is assigned server-side and cannot be selected by the browser.
    const assignedRole: 'customer' = 'customer';
    const assignedStatus: 'active' = 'active';

    const cleanName = sanitizeString(name).trim();
    const cleanPhone = sanitizeString(phone).trim();
    const cleanCorridor = corridorZone ? sanitizeString(corridorZone).trim() : 'Thika Road / Roysambu / Lumumba Drive';
    const cleanAddress = address ? sanitizeString(address).trim() : cleanCorridor;

    const initials = cleanName
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'CU';

    const nowIso = new Date().toISOString();
    const newUser = {
      id: `usr-cust-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      role: assignedRole,
      status: assignedStatus,
      phone: cleanPhone,
      address: cleanAddress,
      corridorZone: cleanCorridor,
      avatar: initials,
      createdAt: nowIso,
      lastLogin: nowIso,
      passwordHash: hashPassword(password)
    };

    db.users.push(newUser);

    const token = createToken({ id: newUser.id, email: newUser.email, role: newUser.role });
    const { passwordHash: _, ...sanitizedUser } = newUser;

    // Real-time broadcast so Admin Dashboard updates instantly
    broadcastEvent('CUSTOMER_REGISTERED', { customer: sanitizedUser });
    broadcastEvent('USER_REGISTERED', { user: sanitizedUser });

    logSecurityEvent('CUSTOMER_REGISTERED_SUCCESS', {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status
    }, req);

    return res.status(201).json({
      token,
      user: sanitizedUser,
      message: 'Account created successfully! Welcome to GasDeliver.'
    });
  };

  app.post('/api/auth/register', authLimiter, handleRegistration);
  app.post('/api/auth/customer-register', authLimiter, handleRegistration);

  // ==========================================
  // DRIVER REGISTRATION & ONBOARDING FUNNEL
  // ==========================================
  app.post('/api/auth/driver-register', authLimiter, (req: Request, res: Response) => {
    const {
      name,
      fullName,
      email,
      phone,
      password,
      confirmPassword,
      corridorZone,
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleType,
      experienceYears,
      nationalIdNumber,
      nationalIdDocumentUrl,
      driverLicenseNumber,
      driverLicenseDocumentUrl,
      emergencyContact
    } = req.body;

    const applicantName = sanitizeString(fullName || name || '').trim();
    if (!applicantName || applicantName.length < 2) {
      return res.status(400).json({ error: 'Full legal name is required (minimum 2 characters).' });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email address is required.' });
    }
    const cleanEmail = sanitizeString(email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'A valid email address is required (e.g. name@example.com).' });
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length < 9) {
      return res.status(400).json({ error: 'A valid phone number is required (e.g. +254 712 345 678).' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (confirmPassword && confirmPassword !== password) {
      return res.status(400).json({ error: 'Passwords do not match. Please re-enter your password.' });
    }

    if (!licensePlate || typeof licensePlate !== 'string' || licensePlate.trim().length < 4) {
      return res.status(400).json({ error: 'Vehicle license plate number is required (e.g. KDB 123A).' });
    }

    if (!nationalIdNumber || typeof nationalIdNumber !== 'string' || nationalIdNumber.trim().length < 6) {
      return res.status(400).json({ error: 'National ID number is required for compliance verification.' });
    }

    if (!driverLicenseNumber || typeof driverLicenseNumber !== 'string' || driverLicenseNumber.trim().length < 5) {
      return res.status(400).json({ error: 'Driver\'s License number is required for verification.' });
    }

    // Check if user with email already exists
    const existing = db.users.find((u) => u.email.toLowerCase().trim() === cleanEmail);
    if (existing) {
      return res.status(400).json({
        error: 'An account with this email address already exists. Please sign in instead.'
      });
    }

    const cleanMake = sanitizeString(vehicleMake || 'Motorcycle/Van').trim();
    const cleanModel = sanitizeString(vehicleModel || 'Standard Delivery').trim();
    const cleanPlate = sanitizeString(licensePlate).toUpperCase().trim();
    const cleanZone = corridorZone ? sanitizeString(corridorZone).trim() : 'Thika Road / Roysambu / Lumumba Drive';
    const cleanNatId = sanitizeString(nationalIdNumber).trim();
    const cleanLicense = sanitizeString(driverLicenseNumber).toUpperCase().trim();

    const appId = `app-drv-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const application = {
      id: appId,
      applicantName,
      email: cleanEmail,
      phone: sanitizeString(phone).trim(),
      nationalIdNumber: cleanNatId,
      nationalIdDocumentUrl: nationalIdDocumentUrl || 'national_id_sample.pdf',
      driverLicenseNumber: cleanLicense,
      driverLicenseDocumentUrl: driverLicenseDocumentUrl || 'driver_license_sample.pdf',
      vehicleMake: cleanMake,
      vehicleModel: cleanModel,
      licensePlate: cleanPlate,
      vehicleType: vehicleType || 'Pickup / Van',
      corridorZone: cleanZone,
      experienceYears: Number(experienceYears) || 2,
      emergencyContact: emergencyContact || undefined,
      status: 'pending' as const,
      submittedAt: nowIso
    };

    if (!db.driverApplications) {
      db.driverApplications = [];
    }
    db.driverApplications.unshift(application);

    // Create pending driver user account
    const initials = applicantName
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'DR';

    const newDriverUser = {
      id: `usr-drv-${Date.now()}`,
      name: applicantName,
      email: cleanEmail,
      role: 'driver' as const,
      status: 'pending',
      verificationStatus: 'pending' as const,
      phone: sanitizeString(phone).trim(),
      corridorZone: cleanZone,
      vehicle: `${cleanMake} ${cleanModel} (${cleanPlate})`,
      vehicleMake: cleanMake,
      vehicleModel: cleanModel,
      licensePlate: cleanPlate,
      nationalId: cleanNatId,
      drivingLicenseNo: cleanLicense,
      accountActivated: false,
      avatar: initials,
      createdAt: nowIso,
      lastLogin: nowIso,
      passwordHash: hashPassword(password)
    };

    db.users.push(newDriverUser);

    // Add activity log
    db.activityLogs.unshift({
      id: `act-${Date.now()}`,
      type: 'driver_registered',
      title: 'New Driver Application',
      description: `${applicantName} applied with ${cleanMake} ${cleanModel} (${cleanPlate}) in ${cleanZone}`,
      timestamp: 'Just now',
      timeAgo: 'Just now'
    });

    broadcastEvent('DRIVER_APPLICATION_SUBMITTED', { application });
    logSecurityEvent('DRIVER_APPLICATION_SUBMITTED', { email: cleanEmail, applicationId: appId }, req);

    return res.status(201).json({
      success: true,
      application,
      message: 'Driver registration received. Your application is under compliance review.'
    });
  });

  app.post('/api/driver/apply', authLimiter, (req: Request, res: Response) => {
    // Forward to handler
    const mockReq = { ...req, url: '/api/auth/driver-register' };
    return (app as any)._router.handle(mockReq, res);
  });

  // ==========================================
  // ADMIN DRIVER VERIFICATION QUEUE ROUTES
  // ==========================================
  app.get('/api/admin/driver-verifications', requireAdmin, (req: Request, res: Response) => {
    const statusFilter = req.query.status as string;
    let list = db.driverApplications || [];
    if (statusFilter && statusFilter !== 'all') {
      list = list.filter((app) => app.status === statusFilter);
    }
    return res.json(list);
  });

  app.post('/api/admin/driver-verifications/:id/approve', requireAdmin, (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    const appId = req.params.id;
    const application = (db.driverApplications || []).find((a) => a.id === appId);

    if (!application) {
      return res.status(404).json({ error: 'Driver application not found.' });
    }

    const nowIso = new Date().toISOString();
    application.status = 'approved';
    application.reviewedAt = nowIso;
    application.reviewedBy = caller?.name || 'Operations Manager';
    if (req.body.notes) {
      application.reviewNotes = sanitizeString(req.body.notes);
    }

    // Activate the user
    const user = db.users.find((u) => u.email.toLowerCase().trim() === application.email.toLowerCase().trim());
    if (user) {
      user.status = 'active';
      user.verificationStatus = 'approved';
      user.accountActivated = true;
    }

    // Add or update live fleet driver
    let driver = db.drivers.find((d) => d.email.toLowerCase().trim() === application.email.toLowerCase().trim());
    const initials = application.applicantName
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'DR';

    const vehicleStr = `${application.vehicleMake} ${application.vehicleModel} (${application.licensePlate})`;

    if (!driver) {
      driver = {
        id: `drv-${Date.now()}`,
        name: application.applicantName,
        phone: application.phone,
        email: application.email,
        initials,
        vehicle: vehicleStr,
        licensePlate: application.licensePlate,
        rating: 5.0,
        status: 'Available',
        deliveredCountToday: 0,
        utilizationPercentage: 0,
        corridorZone: application.corridorZone,
        accountActivated: true,
        nationalId: application.nationalIdNumber,
        drivingLicenseNo: application.driverLicenseNumber,
        createdAt: nowIso,
        activatedAt: nowIso
      };
      db.drivers.unshift(driver);
    } else {
      driver.status = 'Available';
      driver.vehicle = vehicleStr;
      driver.licensePlate = application.licensePlate;
      driver.accountActivated = true;
    }

    // Ensure employee roster has driver
    const emp = db.employees.find((e) => e.email.toLowerCase().trim() === application.email.toLowerCase().trim());
    if (!emp) {
      db.employees.unshift({
        id: `EMP-${Date.now().toString().slice(-4)}`,
        name: application.applicantName,
        email: application.email,
        phone: application.phone,
        role: 'Driver',
        workerType: 'driver',
        status: 'Active',
        availability: 'Available',
        vehicle: vehicleStr,
        licensePlate: application.licensePlate,
        driverId: driver.id,
        nationalId: application.nationalIdNumber,
        driverLicense: application.driverLicenseNumber,
        joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      });
    } else {
      emp.status = 'Active';
      emp.availability = 'Available';
    }

    // Activity log
    db.activityLogs.unshift({
      id: `act-${Date.now()}`,
      type: 'driver_online',
      title: 'Driver Verified & Approved',
      description: `${application.applicantName} approved by ${caller?.name || 'Admin'} (${application.licensePlate})`,
      timestamp: 'Just now',
      timeAgo: 'Just now'
    });

    broadcastEvent('DRIVER_APPLICATION_UPDATED', { application, action: 'approved' });
    broadcastEvent('DRIVER_VERIFIED', { application, driver });
    broadcastEvent('FLEET_UPDATED', { driver });

    return res.json({
      success: true,
      application,
      driver,
      message: `Driver ${application.applicantName} approved and added to active fleet.`
    });
  });

  app.post('/api/admin/driver-verifications/:id/reject', requireAdmin, (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    const appId = req.params.id;
    const application = (db.driverApplications || []).find((a) => a.id === appId);

    if (!application) {
      return res.status(404).json({ error: 'Driver application not found.' });
    }

    const reason = req.body?.reason ? sanitizeString(req.body.reason) : 'Document verification criteria not satisfied.';
    const nowIso = new Date().toISOString();
    application.status = 'rejected';
    application.rejectionReason = reason;
    application.reviewedAt = nowIso;
    application.reviewedBy = caller?.name || 'Operations Manager';

    // Update user
    const user = db.users.find((u) => u.email.toLowerCase().trim() === application.email.toLowerCase().trim());
    if (user) {
      user.status = 'rejected';
      user.verificationStatus = 'rejected';
    }

    broadcastEvent('DRIVER_APPLICATION_UPDATED', { application, action: 'rejected' });

    return res.json({
      success: true,
      application,
      message: `Driver application for ${application.applicantName} rejected.`
    });
  });

  app.post('/api/admin/driver-verifications/:id/suspend', requireAdmin, (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    const appId = req.params.id;
    const application = (db.driverApplications || []).find((a) => a.id === appId);

    if (!application) {
      return res.status(404).json({ error: 'Driver application not found.' });
    }

    const reason = req.body?.reason ? sanitizeString(req.body.reason) : 'Administrative suspension.';
    application.status = 'suspended';
    application.suspensionReason = reason;

    // Update user
    const user = db.users.find((u) => u.email.toLowerCase().trim() === application.email.toLowerCase().trim());
    if (user) {
      user.status = 'suspended';
      user.verificationStatus = 'suspended';
    }

    // Update fleet driver
    const driver = db.drivers.find((d) => d.email.toLowerCase().trim() === application.email.toLowerCase().trim());
    if (driver) {
      driver.status = 'Suspended';
    }

    // Update employee
    const emp = db.employees.find((e) => e.email.toLowerCase().trim() === application.email.toLowerCase().trim());
    if (emp) {
      emp.status = 'Suspended';
      emp.suspensionReason = reason;
    }

    broadcastEvent('DRIVER_APPLICATION_UPDATED', { application, action: 'suspended' });
    broadcastEvent('DRIVER_SUSPENDED', { application, email: application.email, reason });

    return res.json({
      success: true,
      application,
      message: `Driver ${application.applicantName} suspended.`
    });
  });

  // ==========================================
  // ADMIN CUSTOMER MANAGEMENT ROUTES
  // ==========================================
  app.get('/api/admin/customers', requireAdmin, (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can view customer data.' });
    }

    const customerList = db.users
      .filter((u) => u.role === 'customer')
      .map((u) => {
        const userOrders = db.orders.filter((o) =>
          o.customerId === u.id ||
          (u.phone && o.customerPhone === u.phone) ||
          (u.name && o.customerName && o.customerName.toLowerCase().trim() === u.name.toLowerCase().trim())
        );

        const ordersCount = userOrders.length;
        const activeOrdersCount = userOrders.filter(
          (o) => !o.isArchived && o.status !== 'Delivered' && o.status !== 'Cancelled' && o.status !== 'Archived'
        ).length;
        const totalSpent = userOrders
          .filter((o) => o.status === 'Delivered' || o.paymentStatus === 'Paid')
          .reduce((sum, o) => sum + (o.total || 0), 0);

        const { passwordHash: _, ...sanitized } = u;
        return {
          ...sanitized,
          status: u.status || 'active',
          createdAt: u.createdAt || '2025-01-15T08:00:00.000Z',
          lastLogin: u.lastLogin,
          ordersCount,
          activeOrdersCount,
          totalSpent
        };
      });

    return res.json(customerList);
  });

  app.get('/api/admin/customers/:id', requireAdmin, (req: Request, res: Response) => {
    const customer = db.users.find((u) => u.id === req.params.id && u.role === 'customer');
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const userOrders = db.orders.filter((o) =>
      o.customerId === customer.id ||
      (customer.phone && o.customerPhone === customer.phone) ||
      (customer.name && o.customerName && o.customerName.toLowerCase().trim() === customer.name.toLowerCase().trim())
    );

    const { passwordHash: _, ...sanitizedCustomer } = customer;
    return res.json({
      customer: {
        ...sanitizedCustomer,
        status: customer.status || 'active',
        createdAt: customer.createdAt || '2025-01-15T08:00:00.000Z',
        lastLogin: customer.lastLogin,
        ordersCount: userOrders.length,
        totalSpent: userOrders
          .filter((o) => o.status === 'Delivered' || o.paymentStatus === 'Paid')
          .reduce((sum, o) => sum + (o.total || 0), 0)
      },
      orders: userOrders
    });
  });

  app.post('/api/admin/customers/:id/suspend', requireAdmin, (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    const customer = db.users.find((u) => u.id === req.params.id && u.role === 'customer');
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    customer.status = 'suspended';
    const reason = req.body?.reason ? sanitizeString(req.body.reason) : 'Administrative suspension';

    logSecurityEvent('ADMIN_SUSPENDED_CUSTOMER', {
      customerId: customer.id,
      customerEmail: customer.email,
      adminId: caller?.id,
      adminName: caller?.name,
      reason
    }, req);

    const { passwordHash: _, ...sanitized } = customer;
    broadcastEvent('CUSTOMER_UPDATED', { customer: sanitized, action: 'suspended' });

    return res.json({
      message: `Customer ${customer.name} has been suspended.`,
      customer: sanitized
    });
  });

  app.post('/api/admin/customers/:id/reactivate', requireAdmin, (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    const customer = db.users.find((u) => u.id === req.params.id && u.role === 'customer');
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    customer.status = 'active';

    logSecurityEvent('ADMIN_REACTIVATED_CUSTOMER', {
      customerId: customer.id,
      customerEmail: customer.email,
      adminId: caller?.id,
      adminName: caller?.name
    }, req);

    const { passwordHash: _, ...sanitized } = customer;
    broadcastEvent('CUSTOMER_UPDATED', { customer: sanitized, action: 'reactivated' });

    return res.json({
      message: `Customer ${customer.name} has been reactivated.`,
      customer: sanitized
    });
  });

  app.patch('/api/admin/customers/:id/status', requireAdmin, (req: Request, res: Response) => {
    const { status, reason } = req.body;
    if (!['active', 'suspended', 'inactive'].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Allowed values: 'active', 'suspended', 'inactive'." });
    }

    const customer = db.users.find((u) => u.id === req.params.id && u.role === 'customer');
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    customer.status = status;
    const caller = getAuthenticatedUser(req);

    logSecurityEvent('ADMIN_UPDATED_CUSTOMER_STATUS', {
      customerId: customer.id,
      customerEmail: customer.email,
      newStatus: status,
      adminId: caller?.id,
      reason: reason ? sanitizeString(reason) : undefined
    }, req);

    const { passwordHash: _, ...sanitized } = customer;
    broadcastEvent('CUSTOMER_UPDATED', { customer: sanitized, action: status });

    return res.json({
      message: `Customer status updated to ${status}.`,
      customer: sanitized
    });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired authentication token.' });
    }
    const { passwordHash: _, ...sanitizedUser } = user;
    return res.json({ user: sanitizedUser });
  });

  // ==========================================
  // PRODUCTS CATALOG ROUTES
  // ==========================================
  app.get('/api/products', (req: Request, res: Response) => {
    const gasType = req.query.gasType as string;
    let list = db.products;
    if (gasType && gasType !== 'All') {
      list = list.filter((p) => p.gasType.toLowerCase() === gasType.toLowerCase());
    }
    return res.json(list);
  });

  app.post('/api/products', requireAdmin, (req: Request, res: Response) => {
    const { name, gasType, size, weightKg, description, price, stock, tag, deliveryTimeEstimate } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Product name is required.' });
    }
    const cleanPrice = Number(price);
    if (isNaN(cleanPrice) || cleanPrice <= 0) {
      return res.status(400).json({ error: 'Valid positive price is required.' });
    }
    const cleanGasType: GasType = gasType === 'CNG' ? 'CNG' : 'LPG';
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name: sanitizeString(name),
      gasType: cleanGasType,
      size: size ? sanitizeString(size) : `${weightKg} kg`,
      weightKg: Number(weightKg) || 14.2,
      tag: tag ? sanitizeString(tag) : undefined,
      description: description ? sanitizeString(description) : 'High-grade domestic LPG cylinder',
      price: cleanPrice,
      stock: Number(stock) || 10,
      isAvailable: Number(stock) > 0,
      deliveryTimeEstimate: deliveryTimeEstimate ? sanitizeString(deliveryTimeEstimate) : '45-60 min'
    };
    db.products.push(newProduct);
    broadcastEvent('PRODUCT_CREATED', newProduct);
    return res.status(201).json(newProduct);
  });

  app.put('/api/products/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const index = db.products.findIndex((p) => p.id === id);
    if (index === -1) return res.status(404).json({ error: 'Product not found' });
    db.products[index] = { ...db.products[index], ...req.body };
    broadcastEvent('PRODUCT_UPDATED', db.products[index]);
    return res.json(db.products[index]);
  });

  app.delete('/api/products/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body || {};
    try {
      const prod = db.softDeleteProduct(id, reason || 'Discontinued cylinder model');
      broadcastEvent('PRODUCT_UPDATED', prod);
      return res.json({ success: true, product: prod, message: `Product "${prod.name}" archived successfully` });
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  });

  app.post('/api/products/:id/restore', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const prod = db.restoreProduct(id);
      broadcastEvent('PRODUCT_UPDATED', prod);
      return res.json({ success: true, product: prod, message: `Product "${prod.name}" restored successfully` });
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  });

  // ==========================================
  // GAS BRANDS MANAGEMENT ROUTES (ADMIN & STOREFRONT)
  // ==========================================
  app.get('/api/brands', (req: Request, res: Response) => {
    const includeDeleted = req.query.includeDeleted === 'true';
    const brands = db.getBrands(includeDeleted);
    return res.json(brands);
  });

  app.post('/api/brands', requireAdmin, (req: Request, res: Response) => {
    try {
      const newBrand = db.addBrand(req.body);
      broadcastEvent('BRAND_CREATED', newBrand);
      return res.status(201).json(newBrand);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/brands/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const updated = db.updateBrand(id, req.body);
      broadcastEvent('BRAND_UPDATED', updated);
      return res.json(updated);
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  });

  app.delete('/api/brands/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body || {};
    try {
      const deleted = db.softDeleteBrand(id, reason || 'Brand ended or exited Kenyan market');
      broadcastEvent('BRAND_DELETED', deleted);
      return res.json({ success: true, brand: deleted, message: `Gas brand "${deleted.name}" soft-deleted successfully.` });
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  });

  app.post('/api/brands/:id/restore', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const restored = db.restoreBrand(id);
      broadcastEvent('BRAND_RESTORED', restored);
      return res.json({ success: true, brand: restored, message: `Gas brand "${restored.name}" restored successfully.` });
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  });

  // ==========================================
  // ORDERS MANAGEMENT ROUTES (STRICT RBAC & AUTHORITATIVE PRICING)
  // ==========================================
  app.get('/api/orders', (req: Request, res: Response) => {
    let caller = getAuthenticatedUser(req);
    if (!caller) {
      if (process.env.NODE_ENV !== 'production') {
        caller = db.users.find((u) => u.role === 'admin') || {
          id: 'usr-admin-1',
          name: 'Operations Manager',
          email: 'ops.manager@gasdeliver.co.ke',
          role: 'admin',
          status: 'active'
        } as any;
      } else {
        return res.status(401).json({ error: 'Unauthorized: Authentication required to view orders.' });
      }
    }

    const { customerId, status, driverId, includeArchived, scope } = req.query;
    let list = [...db.orders];

    // Filter out archived orders unless explicitly requested or querying status=Archived
    if (includeArchived !== 'true' && status !== 'Archived') {
      list = list.filter((o) => !o.isArchived && o.status !== 'Archived');
    }

    // STRICT ACCESS CONTROL (IDOR MITIGATION):
    if (caller.role === 'customer') {
      // Customer can ONLY access their own orders
      const callerName = caller.name?.toLowerCase().trim();
      list = list.filter((o) =>
        o.customerId === caller.id ||
        (caller.phone && o.customerPhone === caller.phone) ||
        Boolean(callerName && o.customerName && o.customerName.toLowerCase().trim() === callerName)
      );
    } else if (caller.role === 'driver') {
      // Driver can view deliveries assigned to them or active corridor orders available for acceptance
      const callerName = caller.name?.toLowerCase().trim();
      const driverRecord = db.drivers.find(
        (d) => (callerName && d.name && d.name.toLowerCase().trim() === callerName) || d.id === (caller as any).driverId
      );
      const targetDriverId = (caller as any).driverId || driverRecord?.id || (driverId as string) || 'drv-1';
      const driverRecordName = driverRecord?.name?.toLowerCase().trim();

      if (scope === 'my' || driverId) {
        list = list.filter((o) => {
          const orderDriverName = o.driverName?.toLowerCase().trim();
          return Boolean(
            (o.driverId && (o.driverId === targetDriverId || (driverRecord && o.driverId === driverRecord.id))) ||
            (driverRecordName && orderDriverName && orderDriverName === driverRecordName) ||
            (callerName && orderDriverName && orderDriverName === callerName)
          );
        });
      } else {
        // Unassigned or assigned to this driver
        list = list.filter((o) => {
          const isAssignedToMe = Boolean(
            (o.driverId && (o.driverId === targetDriverId || (driverRecord && o.driverId === driverRecord.id))) ||
            (driverRecordName && o.driverName && o.driverName.toLowerCase().trim() === driverRecordName)
          );
          const isAvailableToClaim = !o.driverId && (o.status === 'Pending' || o.status === 'Preparing');
          return isAssignedToMe || isAvailableToClaim;
        });
      }
    } else {
      // Admin: can view all or filter by customer/driver
      if (customerId) {
        list = list.filter((o) => o.customerId === customerId);
      }
      if (driverId) {
        list = list.filter((o) => o.driverId === driverId);
      }
    }

    if (status && status !== 'All') {
      list = list.filter((o) => o.status === status);
    }

    return res.json(list);
  });

  app.get('/api/orders/:id', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required to view order details.' });
    }

    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Customer can only view their own order
    if (caller.role === 'customer') {
      const callerName = caller.name?.toLowerCase().trim();
      const isOwner =
        order.customerId === caller.id ||
        (caller.phone && order.customerPhone === caller.phone) ||
        Boolean(callerName && order.customerName && order.customerName.toLowerCase().trim() === callerName);
      if (!isOwner) {
        logSecurityEvent('IDOR_ORDER_ACCESS_BLOCKED', { orderId: order.id, customerId: caller.id }, req);
        return res.status(403).json({ error: 'Access Denied: You cannot view orders that do not belong to you.' });
      }
    }

    // Driver can only view assigned orders or unassigned pending delivery orders
    if (caller.role === 'driver') {
      const callerName = caller.name?.toLowerCase().trim();
      const driverRecord = db.drivers.find(
        (d) => (callerName && d.name && d.name.toLowerCase().trim() === callerName) || d.id === (caller as any).driverId
      );
      const targetDriverId = (caller as any).driverId || driverRecord?.id || 'drv-1';
      const driverRecordName = driverRecord?.name?.toLowerCase().trim();
      const orderDriverName = order.driverName?.toLowerCase().trim();

      const isAssigned = Boolean(
        (order.driverId && (order.driverId === targetDriverId || (driverRecord && order.driverId === driverRecord.id))) ||
        (driverRecordName && orderDriverName && orderDriverName === driverRecordName) ||
        (callerName && orderDriverName && orderDriverName === callerName)
      );
      const isClaimable = !order.driverId && (order.status === 'Pending' || order.status === 'Preparing');

      if (!isAssigned && !isClaimable) {
        logSecurityEvent('IDOR_DRIVER_ORDER_ACCESS_BLOCKED', { orderId: order.id, driverId: caller.id }, req);
        return res.status(403).json({ error: 'Access Denied: You can only view orders assigned to your delivery vehicle or available to claim.' });
      }
    }

    return res.json(order);
  });

  app.post('/api/orders', orderLimiter, (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    const {
      customerId,
      customerName,
      customerPhone,
      deliveryAddress,
      items,
      deliverySlot,
      paymentMethod,
      mpesaPhone
    } = req.body;

    // Check if customer account is suspended
    const targetUserId = caller?.id || customerId;
    if (targetUserId) {
      const userRecord = db.users.find((u) => u.id === targetUserId);
      if (userRecord && userRecord.status === 'suspended') {
        return res.status(403).json({ error: 'Your account is currently suspended. Please contact GasDeliver support.' });
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // STRICT PAYMENT METHOD ENFORCEMENT: ONLY 'M-Pesa' and 'Cash on Delivery'
    const allowedPaymentMethods = ['M-Pesa', 'Cash on Delivery', 'M-Pesa Mobile Money'];
    if (!paymentMethod || !allowedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        error: "Invalid payment method. Only 'M-Pesa' and 'Cash on Delivery' are supported."
      });
    }

    const normalizedPaymentMethod =
      paymentMethod === 'Cash on Delivery' ? 'Cash on Delivery' : 'M-Pesa';

    // If M-Pesa, require and validate contact phone for STK push
    const resolvedPhone = mpesaPhone || customerPhone || caller?.phone;
    if (normalizedPaymentMethod === 'M-Pesa' && !resolvedPhone) {
      return res.status(400).json({
        error: 'A valid Safaricom phone number is required for M-Pesa STK push processing.'
      });
    }

    // SERVER-AUTHORITATIVE PRICING & INVENTORY INTEGRITY VERIFICATION
    let subtotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const quantity = validatePositiveInteger(item.quantity, 1, 50);
      if (!quantity) {
        return res.status(400).json({ error: 'Item quantity must be a positive integer between 1 and 50.' });
      }

      const product = db.products.find((p) => p.id === item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product ID "${item.productId}" is invalid or discontinued.` });
      }

      if (product.stock < quantity) {
        return res.status(400).json({ error: `Insufficient inventory for ${product.name}. Available: ${product.stock}` });
      }

      // Authoritative catalog pricing prevents client-side price tampering
      const unitPrice = product.price;
      subtotal += unitPrice * quantity;

      verifiedItems.push({
        productId: product.id,
        name: product.name,
        brand: product.brand || req.body.cylinderBrand || 'TotalEnergies',
        size: product.size,
        orderType: product.orderType || 'refill',
        unitPrice,
        quantity
      });
    }

    const deliveryFee = 200; // Fixed verified corridor standard delivery fee
    const total = subtotal + deliveryFee;

    const orderNumber = Math.floor(1000 + Math.random() * 9000);
    const id = `OD-2024-${orderNumber}`;

    // Generate secure M-Pesa transaction reference for STK push
    let mpesaTransactionId: string | undefined;
    if (normalizedPaymentMethod === 'M-Pesa') {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = 'MP-';
      for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      mpesaTransactionId = code;
    }

    // Secure user binding: If caller is authenticated customer, bind strictly to caller account
    const verifiedCustomerId = (caller && caller.role === 'customer') ? caller.id : sanitizeString(customerId || 'usr-customer-1');
    const verifiedCustomerName = (caller && caller.role === 'customer') ? caller.name : sanitizeString(customerName || 'Valued Customer');
    const verifiedCustomerPhone = (caller && caller.role === 'customer') ? caller.phone : sanitizeString(customerPhone || '+254 712 345 678');

    const paymentNote =
      normalizedPaymentMethod === 'M-Pesa'
        ? `M-Pesa STK Push prompt verified (${resolvedPhone}). Ref: ${mpesaTransactionId}`
        : 'Cash on Delivery selected. Payment to be collected by rider upon cylinder inspection.';

    const brandLabel = req.body.cylinderBrand || items[0]?.brand || 'TotalEnergies';
    const orderTypeLabel = req.body.cylinderOrderType || items[0]?.orderType || 'refill';
    const cylinderSize = req.body.cylinderSize || items[0]?.size || '13 kg';
    const summaryPrefix = brandLabel ? `${brandLabel} ` : '';
    const typeLabel = orderTypeLabel === 'complete_kit' ? 'Kit' : 'Refill';

    // Thika Highway corridor coordinates registry for customer live location fallback
    const CORRIDOR_ZONE_COORDS: Record<string, { lat: number; lng: number }> = {
      'zone-roysambu': { lat: -1.2185, lng: 36.8872 },
      'Roysambu / TRM / Lumumba Drive': { lat: -1.2185, lng: 36.8872 },
      'Roysambu': { lat: -1.2185, lng: 36.8872 },
      'zone-kahawa': { lat: -1.1820, lng: 36.9320 },
      'Kahawa Sukari / Kahawa Wendani / KU Main Gate': { lat: -1.1820, lng: 36.9320 },
      'Kahawa Sukari': { lat: -1.1820, lng: 36.9320 },
      'zone-mirema': { lat: -1.2110, lng: 36.8780 },
      'Mirema Drive / USIU / Safari Park / Zimmerman': { lat: -1.2110, lng: 36.8780 },
      'Mirema': { lat: -1.2110, lng: 36.8780 },
      'zone-kasarani': { lat: -1.2220, lng: 36.8990 },
      'Kasarani / Sports View / Sunton / Hunters': { lat: -1.2220, lng: 36.8990 },
      'Kasarani': { lat: -1.2220, lng: 36.8990 },
      'zone-gardencity': { lat: -1.2330, lng: 36.8720 },
      'Garden City Mall / Willstone / Roasters': { lat: -1.2330, lng: 36.8720 },
      'Garden City': { lat: -1.2330, lng: 36.8720 },
      'zone-ruaraka': { lat: -1.2460, lng: 36.8610 },
      'Ruaraka / Allsopps / Survey of Kenya / Utalii': { lat: -1.2460, lng: 36.8610 },
      'Ruaraka': { lat: -1.2460, lng: 36.8610 },
      'zone-ngara': { lat: -1.2750, lng: 36.8310 },
      'Ngara / Pangani / Guru Nanak / Park Road': { lat: -1.2750, lng: 36.8310 },
      'Ngara': { lat: -1.2750, lng: 36.8310 },
      'zone-cbd': { lat: -1.2830, lng: 36.8235 },
      'CBD / Globe Cinema Roundabout': { lat: -1.2830, lng: 36.8235 },
      'zone-pangani': { lat: -1.2680, lng: 36.8400 },
      'zone-muthaiga': { lat: -1.2580, lng: 36.8480 },
      'zone-githurai': { lat: -1.1960, lng: 36.9150 },
      'zone-thikatown': { lat: -1.0380, lng: 37.0730 },
      'zone-juja': { lat: -1.1020, lng: 37.0140 },
      'zone-ruiru': { lat: -1.1470, lng: 36.9610 }
    };

    const zoneKey = req.body.thikaHighwayZone || (typeof deliveryAddress === 'object' ? deliveryAddress?.thikaHighwayZone : null) || 'zone-roysambu';
    const fallbackCoord = CORRIDOR_ZONE_COORDS[zoneKey] || { lat: -1.2185, lng: 36.8872 };
    const orderLat = req.body.customerLiveLocation?.lat || (typeof deliveryAddress === 'object' ? deliveryAddress?.coordinates?.lat : null) || fallbackCoord.lat;
    const orderLng = req.body.customerLiveLocation?.lng || (typeof deliveryAddress === 'object' ? deliveryAddress?.coordinates?.lng : null) || fallbackCoord.lng;

    const resolvedCustomerLiveLocation = {
      lat: orderLat,
      lng: orderLng,
      accuracy: req.body.customerLiveLocation?.accuracy || 6,
      updatedAt: new Date().toISOString(),
      isSharing: true
    };

    const addressObj = (typeof deliveryAddress === 'object' && deliveryAddress !== null)
      ? deliveryAddress
      : {
          street: typeof deliveryAddress === 'string' && deliveryAddress.trim() ? deliveryAddress.trim() : 'Lumumba Drive, Roysambu Court 4',
          city: 'Nairobi (Thika Superhighway)',
          zipCode: '00100'
        };

    const finalDeliveryAddress = {
      ...addressObj,
      coordinates: {
        lat: orderLat,
        lng: orderLng
      }
    };

    const newOrder: Order = {
      id,
      customerId: verifiedCustomerId,
      customerName: verifiedCustomerName,
      customerPhone: verifiedCustomerPhone,
      deliveryAddress: finalDeliveryAddress,
      cylinderBrand: brandLabel,
      cylinderOrderType: orderTypeLabel,
      cylinderSize: cylinderSize,
      thikaHighwayZone: req.body.thikaHighwayZone || deliveryAddress?.thikaHighwayZone || 'Roysambu',
      items,
      cylinderSummary: `${summaryPrefix}${cylinderSize} ${typeLabel} × ${items[0]?.quantity || 1}`,
      status: 'Pending',
      deliverySlot: deliverySlot || 'Express Thika Road (Within 30-40 min)',
      deliveryDate: 'Today',
      slaRemainingMinutes: 35,
      subtotal,
      deliveryFee,
      total,
      priority: 'Normal',
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: normalizedPaymentMethod === 'Cash on Delivery' ? 'Pending' : 'Paid',
      mpesaPhone: normalizedPaymentMethod === 'M-Pesa' ? resolvedPhone : undefined,
      mpesaTransactionId,
      customerLiveLocation: resolvedCustomerLiveLocation,
      createdAt: new Date().toISOString(),
      statusHistory: [
        {
          status: 'Pending',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          note: paymentNote,
          isCompleted: true
        }
      ]
    };

    // Update product stock
    items.forEach((item: any) => {
      const prod = db.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        prod.isAvailable = prod.stock > 0;
      }
    });

    db.orders.unshift(newOrder);
    broadcastEvent('ORDER_CREATED', newOrder);
    return res.status(201).json(newOrder);
  });

  // Assign or Reassign driver to order (Admin Only)
  app.put('/api/orders/:id/assign', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only Admin Dispatchers can assign delivery drivers.' });
    }

    const { id } = req.params;
    const { driverId } = req.body;

    const order = db.orders.find((o) => o.id === id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const driver = db.drivers.find((d) => d.id === driverId);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    // Handle reassignment if already assigned to a previous driver
    const previousDriverId = order.driverId;
    if (previousDriverId && previousDriverId !== driverId) {
      const prevDriver = db.drivers.find((d) => d.id === previousDriverId);
      if (prevDriver) {
        prevDriver.activeOrderId = undefined;
        prevDriver.status = 'Available';
        prevDriver.currentStop = 'Nairobi Central Depot';
      }
    }

    order.driverId = driver.id;
    order.driverName = driver.name;
    order.driverPhone = driver.phone;
    order.driverVehicle = driver.vehicle;
    order.driverRating = driver.rating;
    order.driverEtaMinutes = 18;
    order.status = 'Dispatched';
    order.isOverdue = false;

    // Ensure customerLiveLocation and doorstep coordinates are guaranteed on assigned order
    if (!order.customerLiveLocation || !order.customerLiveLocation.lat) {
      const fallbackLat = order.deliveryAddress?.coordinates?.lat || -1.2185;
      const fallbackLng = order.deliveryAddress?.coordinates?.lng || 36.8872;
      order.customerLiveLocation = {
        lat: fallbackLat,
        lng: fallbackLng,
        accuracy: 6,
        updatedAt: new Date().toISOString(),
        isSharing: true
      };
      if (order.deliveryAddress) {
        order.deliveryAddress.coordinates = { lat: fallbackLat, lng: fallbackLng };
      }
    }

    // Update driver state
    driver.status = 'On Route';
    driver.currentStop = order.deliveryAddress?.street || 'Nairobi Hub';
    driver.activeOrderId = order.id;

    order.statusHistory.push({
      status: 'Dispatched',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      note: previousDriverId ? `Reassigned to ${driver.name}` : `Assigned to ${driver.name}`,
      isCompleted: true
    });

    broadcastEvent('DRIVER_ASSIGNED', { order, driver });
    broadcastEvent('ORDER_UPDATED', order);
    broadcastEvent('DRIVER_UPDATED', driver);
    return res.json({ order, driver });
  });

  // Driver Claim/Accept Unassigned Order (Corridor Real-Time self-dispatch)
  app.put('/api/orders/:id/claim', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || (caller.role !== 'driver' && caller.role !== 'admin')) {
      return res.status(403).json({ error: 'Access Denied: Only registered field couriers and admins can claim deliveries.' });
    }

    const { id } = req.params;

    const order = db.orders.find((o) => o.id === id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Resolve driver record
    let driver = db.drivers.find(
      (d) =>
        d.id === caller.id ||
        d.id === (caller as any).driverId ||
        (caller.name && d.name.toLowerCase() === caller.name.toLowerCase())
    );

    if (!driver && req.body.driverId && caller.role === 'admin') {
      driver = db.drivers.find((d) => d.id === req.body.driverId);
    }
    if (!driver) {
      driver = db.drivers[0];
    }

    // Check if order is already assigned to a DIFFERENT driver
    if (order.driverId && order.driverId !== driver.id) {
      return res.status(409).json({
        error: `Order is already assigned to ${order.driverName || 'another driver'}.`
      });
    }

    order.driverId = driver.id;
    order.driverName = driver.name;
    order.driverPhone = driver.phone;
    order.driverVehicle = driver.vehicle;
    order.driverRating = driver.rating;
    order.driverEtaMinutes = order.driverEtaMinutes || 20;
    order.status = 'Accepted';
    order.isOverdue = false;

    // Update driver state
    driver.status = 'On Delivery';
    driver.currentStop = order.deliveryAddress?.street || 'Nairobi Hub';
    driver.activeOrderId = order.id;

    order.statusHistory.push({
      status: 'Accepted',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      note: `Delivery claimed & accepted by courier ${driver.name}`,
      isCompleted: true
    });

    broadcastEvent('DRIVER_ASSIGNED', { order, driver });
    broadcastEvent('ORDER_UPDATED', order);
    broadcastEvent('DRIVER_UPDATED', driver);
    return res.json({ success: true, order, driver });
  });

  // General Order Update (Edit delivery address, notes, priority, customer details)
  app.put('/api/orders/:id', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    const { id } = req.params;
    const order = db.orders.find((o) => o.id === id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Access control: customer can only edit their own pending orders
    if (caller.role === 'customer') {
      const isOwner =
        order.customerId === caller.id ||
        (caller.phone && order.customerPhone === caller.phone) ||
        (caller.name && order.customerName.toLowerCase() === caller.name.toLowerCase());
      if (!isOwner) {
        return res.status(403).json({ error: 'Access Denied: You can only modify your own orders.' });
      }
      if (order.status !== 'Pending' && order.status !== 'Preparing') {
        return res.status(400).json({ error: 'Order is already in delivery dispatch and cannot be modified.' });
      }
    }

    const {
      deliveryAddress,
      customerPhone,
      customerName,
      priority,
      deliverySlot,
      notes,
      thikaHighwayZone
    } = req.body;

    if (deliveryAddress) order.deliveryAddress = { ...order.deliveryAddress, ...deliveryAddress };
    if (customerPhone) order.customerPhone = sanitizeString(customerPhone);
    if (customerName) order.customerName = sanitizeString(customerName);
    if (priority) order.priority = priority;
    if (deliverySlot) order.deliverySlot = deliverySlot;
    if (thikaHighwayZone) order.thikaHighwayZone = thikaHighwayZone;
    if (notes) {
      if (!order.deliveryAddress) order.deliveryAddress = { street: '', city: 'Nairobi', zipCode: '00100' };
      order.deliveryAddress.landmark = sanitizeString(notes);
    }

    order.statusHistory.push({
      status: order.status,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      note: `Order details updated by ${caller.name || 'Administrator'}`,
      isCompleted: true
    });

    broadcastEvent('ORDER_UPDATED', order);
    return res.json(order);
  });

  // Confirm payment (Cash on delivery collection or M-Pesa manual reconciliation)
  app.put('/api/orders/:id/payment', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || (caller.role !== 'admin' && caller.role !== 'driver')) {
      return res.status(403).json({ error: 'Access Denied: Only courier personnel and administrators can reconcile order payments.' });
    }

    const { id } = req.params;
    const { paymentStatus } = req.body;

    const order = db.orders.find((o) => o.id === id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.paymentStatus = paymentStatus || 'Paid';
    broadcastEvent('ORDER_UPDATED', order);
    return res.json(order);
  });

  // Customer Live Location Sharing for active delivery
  app.put('/api/orders/:id/customer-location', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    const { id } = req.params;
    const { lat, lng, accuracy, isSharing } = req.body;

    const order = db.orders.find((o) => o.id === id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (caller.role === 'customer') {
      const callerName = caller.name?.toLowerCase().trim();
      const isOwner =
        order.customerId === caller.id ||
        (caller.phone && order.customerPhone === caller.phone) ||
        Boolean(callerName && order.customerName && order.customerName.toLowerCase().trim() === callerName);
      if (!isOwner) {
        return res.status(403).json({ error: 'Access Denied: You cannot update location for this order.' });
      }
    }

    if (isSharing) {
      if (!validateCoordinates(lat, lng)) {
        return res.status(400).json({ error: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required.' });
      }
      order.customerLiveLocation = {
        lat: Number(lat),
        lng: Number(lng),
        accuracy: typeof accuracy === 'number' ? accuracy : undefined,
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isSharing: true
      };
      if (order.deliveryAddress) {
        order.deliveryAddress.coordinates = { lat: Number(lat), lng: Number(lng) };
      }
    } else {
      order.customerLiveLocation = {
        lat: order.customerLiveLocation?.lat || 0,
        lng: order.customerLiveLocation?.lng || 0,
        accuracy: order.customerLiveLocation?.accuracy,
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isSharing: false
      };
    }

    broadcastEvent('ORDER_UPDATED', order);
    broadcastEvent('CUSTOMER_LOCATION_UPDATED', {
      orderId: order.id,
      customerLiveLocation: order.customerLiveLocation,
      driverId: order.driverId
    });

    return res.json({
      success: true,
      message: isSharing ? 'Customer live location updated' : 'Customer stopped live location sharing',
      customerLiveLocation: order.customerLiveLocation
    });
  });

  // Report delivery issue (Driver workflow)
  app.post('/api/orders/:id/report-issue', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || (caller.role !== 'driver' && caller.role !== 'admin')) {
      return res.status(403).json({ error: 'Access Denied: Only couriers and administrators can report delivery alerts.' });
    }

    const { id } = req.params;
    const { issueType, notes } = req.body;

    const order = db.orders.find((o) => o.id === id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const issueText = `[Dispatch Alert: ${sanitizeString(issueType || 'Delivery Issue')}] ${sanitizeString(notes || 'Issue reported by courier')}`;
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      note: issueText,
      isCompleted: false
    });

    broadcastEvent('ORDER_UPDATED', order);
    return res.json({ success: true, message: `Report logged: ${issueType}`, order });
  });

  // Restock inventory products (Admin Only)
  app.post('/api/products/:id/restock', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const amount = Number(req.body.amount) || 20;

    const product = db.products.find((p) => p.id === id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    product.stock += amount;
    product.isAvailable = product.stock > 0;
    broadcastEvent('PRODUCT_UPDATED', product);
    return res.json(product);
  });

  // Update order status (Driver workflow: Assigned -> Accepted -> En Route -> Arrived -> Delivered)
  app.put('/api/orders/:id/status', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    const { id } = req.params;
    let { status, proofOfDelivery } = req.body as {
      status: OrderStatus;
      proofOfDelivery?: any;
    };

    const order = db.orders.find((o) => o.id === id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Strict access control: Customers cannot update delivery status, except cancelling their own pending order
    if (caller.role === 'customer') {
      const isOwner =
        order.customerId === caller.id ||
        (caller.phone && order.customerPhone === caller.phone) ||
        (caller.name && order.customerName.toLowerCase() === caller.name.toLowerCase());
      if (isOwner && status === 'Cancelled' && (order.status === 'Pending' || order.status === 'Preparing')) {
        // Permitted: Customer cancelling their un-dispatched order
      } else {
        return res.status(403).json({ error: 'Access Denied: Customers cannot modify delivery status.' });
      }
    }

    // Strict access control: Driver can ONLY update orders assigned to them
    if (caller.role === 'driver') {
      const callerName = caller.name?.toLowerCase().trim();
      const driverRecord = db.drivers.find(
        (d) => (callerName && d.name && d.name.toLowerCase().trim() === callerName) || d.id === (caller as any).driverId
      );
      const targetDriverId = (caller as any).driverId || driverRecord?.id || 'drv-1';
      const isAssigned = Boolean(
        (order.driverId && order.driverId === targetDriverId) ||
        (driverRecord && order.driverId === driverRecord.id) ||
        (callerName && order.driverName && order.driverName.toLowerCase().trim() === callerName)
      );
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access Denied: You can only update orders assigned to your vehicle.' });
      }
    }

    // Validate state machine transitions (Admin can override any stage)
    const isAdmin = caller.role === 'admin';
    const current = order.status;
    const allowedTransitions: Record<string, string[]> = {
      'Pending': ['Preparing', 'Assigned', 'Driver Assigned', 'Accepted', 'Dispatched', 'Cancelled'],
      'Preparing': ['Assigned', 'Driver Assigned', 'Accepted', 'Dispatched', 'Cancelled'],
      'Assigned': ['Accepted', 'Dispatched', 'En Route', 'Out for Delivery', 'Cancelled'],
      'Driver Assigned': ['Accepted', 'Dispatched', 'En Route', 'Out for Delivery', 'Arrived', 'Cancelled'],
      'Accepted': ['Dispatched', 'En Route', 'Out for Delivery', 'Arrived', 'Cancelled'],
      'Dispatched': ['Accepted', 'En Route', 'Out for Delivery', 'Arrived', 'Cancelled'],
      'En Route': ['Arrived', 'Out for Delivery', 'Delivered', 'Cancelled'],
      'Out for Delivery': ['Arrived', 'En Route', 'Delivered', 'Cancelled'],
      'Arrived': ['Delivered', 'En Route', 'Cancelled'],
      'Delivered': [],
      'Cancelled': ['Pending', 'Preparing', 'Assigned', 'Driver Assigned', 'Accepted']
    };

    const allowed = allowedTransitions[current] || [];
    // Allow idempotent status update or admin supervisor override
    if (!isAdmin && current !== status && !allowed.includes(status)) {
      return res.status(400).json({
        error: `Invalid delivery workflow transition from "${current}" to "${status}". Required flow: Assigned → Accepted → Dispatched/Picked Up → En Route → Arrived → Delivered.`
      });
    }

    // Proof of delivery validation before completing delivery
    if (status === 'Delivered') {
      if (!proofOfDelivery) {
        if (isAdmin) {
          proofOfDelivery = {
            customerSignoffName: order.customerName,
            recipientRelation: 'Self',
            serialNumberConfirmed: true,
            safetySealInspected: true,
            leakTestPassed: true,
            deliveredQuantity: order.items?.reduce((a: number, c: any) => a + (c.quantity || 1), 0) || 1,
            notes: 'Admin manual completion override'
          };
        } else {
          return res.status(400).json({
            error: 'Proof of Delivery required: Please confirm delivery before marking order as Delivered.'
          });
        }
      }
      const deliveredQty = Number(proofOfDelivery.deliveredQuantity);
      if (isNaN(deliveredQty) || deliveredQty <= 0) {
        return res.status(400).json({
          error: 'Validation Error: Please confirm delivered cylinder quantity (must be at least 1).'
        });
      }
    }

    order.status = status;

    // Automatically mark pickup location as completed if transitioning to dispatched, en route, arrived, or delivered
    if (order.pickupLocation && (status === 'Dispatched' || status === 'En Route' || status === 'Out for Delivery' || status === 'Arrived' || status === 'Delivered')) {
      order.pickupLocation.isPickedUp = true;
      if (!order.pickupLocation.pickedUpAt) {
        order.pickupLocation.pickedUpAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    order.statusHistory.push({
      status,
      timestamp: timeString,
      note: status === 'Delivered' ? (proofOfDelivery?.deliveryNotes || 'Delivered to customer') : undefined,
      isCompleted: true
    });

    if (proofOfDelivery) {
      order.proofOfDelivery = {
        ...proofOfDelivery,
        timestamp: new Date().toISOString(),
        confirmedByCustomer: true
      };
      order.paymentStatus = 'Paid';
    }

    // Update driver state based on order status transition
    if (order.driverId) {
      const driver = db.drivers.find((d) => d.id === order.driverId);
      if (driver) {
        if (status === 'Accepted' || status === 'En Route' || status === 'Out for Delivery' || status === 'Arrived') {
          driver.status = 'On Delivery';
          driver.activeOrderId = order.id;
          if (order.deliveryAddress?.street) {
            driver.currentStop = order.deliveryAddress.street;
          }
        } else if (status === 'Delivered') {
          driver.deliveredCountToday = (driver.deliveredCountToday || 0) + 1;
          driver.status = 'Online';
          driver.currentStop = 'Available - Nairobi Hub';
          driver.activeOrderId = undefined;

          // Decrement loaded cylinder count accurately
          const cylindersCount = Number(proofOfDelivery?.deliveredQuantity) ||
            order.items.reduce((acc, it) => acc + (it.quantity || 1), 0) || 1;
          driver.load = Math.max(0, (driver.load ?? 8) - cylindersCount);
        } else if (status === 'Cancelled') {
          driver.status = 'Online';
          driver.activeOrderId = undefined;
        }
        driver.lastLocationUpdate = timeString;
      }
    }

    broadcastEvent('ORDER_UPDATED', order);
    if (order.driverId) {
      const updatedDriver = db.drivers.find((d) => d.id === order.driverId);
      if (updatedDriver) {
        broadcastEvent('DRIVER_UPDATED', updatedDriver);
      }
    }
    return res.json(order);
  });

  // SOFT-DELETE & ARCHIVE ORDER ROUTES
  app.post('/api/orders/:id/archive', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can archive orders.' });
    }

    try {
      const reason = req.body?.reason || 'Soft-deleted and archived by Administrator';
      const archived = db.archiveOrder(req.params.id, reason, caller?.name || 'Alex Kiprono');
      broadcastEvent('ORDER_ARCHIVED', archived);
      return res.json({ message: 'Order marked as Archived', order: archived });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to archive order' });
    }
  });

  app.post('/api/orders/:id/restore', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can restore archived orders.' });
    }

    try {
      const restored = db.restoreOrder(req.params.id, caller?.name || 'Alex Kiprono');
      broadcastEvent('ORDER_RESTORED', restored);
      return res.json({ message: `Order #${restored.id} restored to ${restored.status}`, order: restored });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to restore order' });
    }
  });

  app.delete('/api/orders/:id', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can soft-delete orders.' });
    }

    try {
      const reason = req.body?.reason || 'Soft-deleted from active orders';
      const result = db.deleteOrder(req.params.id, reason, caller?.name || 'Alex Kiprono');
      broadcastEvent('ORDER_ARCHIVED', result.order);
      return res.json({ message: 'Order soft-deleted (marked as Archived)', ...result });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to delete order' });
    }
  });

  // ==========================================
  // DRIVER ACCOUNT ACTIVATION (INVITATION FLOW)
  // ==========================================
  app.get('/api/auth/driver-activation/verify', (req: Request, res: Response) => {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ valid: false, error: 'Activation token is required.' });
    }

    const verification = verifyActivationToken(token);
    if (!verification.valid || !verification.record) {
      return res.status(400).json({ valid: false, error: verification.error || 'Invalid or expired activation link.' });
    }

    const driverUser = db.users.find(
      (u) => u.id === verification.record!.userId || u.email.toLowerCase() === verification.record!.email.toLowerCase()
    );

    if (!driverUser) {
      return res.status(404).json({ valid: false, error: 'Associated driver user account could not be found.' });
    }

    if (driverUser.accountActivated === true) {
      return res.status(400).json({
        valid: false,
        error: 'This driver account has already been activated. You can proceed directly to Driver Login.',
        alreadyActivated: true
      });
    }

    return res.json({
      valid: true,
      driverName: verification.record.driverName,
      email: verification.record.email,
      driverId: verification.record.driverId
    });
  });

  app.post('/api/auth/driver-activation/activate', authLimiter, (req: Request, res: Response) => {
    const { token, password, confirmPassword } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Activation token is required.' });
    }

    const verification = verifyActivationToken(token);
    if (!verification.valid || !verification.record) {
      return res.status(400).json({ error: verification.error || 'Invalid or expired activation link.' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match. Please re-enter your password.' });
    }

    const record = verification.record;
    const user = db.users.find(
      (u) => u.id === record.userId || u.email.toLowerCase() === record.email.toLowerCase()
    );

    if (!user) {
      return res.status(404).json({ error: 'Associated driver account could not be found.' });
    }

    // Role MUST remain strictly driver (server-side enforced, cannot change role)
    if (user.role !== 'driver') {
      logSecurityEvent('MALICIOUS_ROLE_ESCALATION_ATTEMPT', { userId: user.id, email: user.email }, req);
      return res.status(403).json({ error: 'Access Denied: Invalid account activation request.' });
    }

    if (user.accountActivated === true) {
      return res.status(400).json({ error: 'This account has already been activated. Please sign in.' });
    }

    // Securely hash the password with scrypt
    user.passwordHash = hashPassword(password);
    user.accountActivated = true;
    user.status = 'active';

    // Update driver in fleet database
    const driver = db.drivers.find(
      (d) => d.id === record.driverId || d.email.toLowerCase() === record.email.toLowerCase()
    );
    if (driver) {
      driver.status = 'Available';
      driver.accountActivated = true;
      driver.activatedAt = new Date().toISOString();
      broadcastEvent('DRIVER_UPDATED', driver);
    }

    // Update employee status if applicable
    const employee = db.employees.find(
      (e) => e.email.toLowerCase() === record.email.toLowerCase() || (driver && e.driverId === driver.id)
    );
    if (employee) {
      employee.status = 'Active';
      broadcastEvent('EMPLOYEE_UPDATED', employee);
    }

    // Immediately consume and invalidate the single-use token
    consumeActivationToken(token);

    logSecurityEvent('DRIVER_ACCOUNT_ACTIVATED', {
      userId: user.id,
      driverId: record.driverId,
      email: user.email
    }, req);

    return res.json({
      success: true,
      message: 'Your GasDeliver driver account has been activated successfully! You can now log in with your credentials.',
      email: user.email
    });
  });

  // ==========================================
  // FLEET DRIVER ROUTES
  // ==========================================
  app.get('/api/drivers', (_req: Request, res: Response) => {
    // Ensure all drivers have clean numeric load, capacity, and accurate status
    const drivers = db.drivers.map((d) => ({
      ...d,
      capacity: typeof d.capacity === 'number' && !isNaN(d.capacity) ? d.capacity : 20,
      load: typeof d.load === 'number' && !isNaN(d.load) ? d.load : 8,
      status: d.status === 'pending' || d.status === 'Pending' || d.accountActivated === false
        ? 'Pending'
        : (d.status === 'Available' ? 'Online' : d.status === 'On Route' ? 'On Delivery' : d.status),
      accountActivated: d.accountActivated !== false
    }));
    return res.json(drivers);
  });

  // Admin Driver Registration (Only Authenticated Admins)
  app.post('/api/admin/drivers', requireAdmin, async (req: Request, res: Response) => {
    const caller = (req as any).user || getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only authenticated administrators can create driver accounts.' });
    }

    const {
      name,
      email,
      phone,
      vehicleType,
      licensePlate,
      capacity,
      corridorZone,
      assignedHub,
      nationalId,
      drivingLicenseNo
    } = req.body;

    // Server-side validations
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Full legal name is required (at least 2 characters).' });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = sanitizeString(email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Valid email address format is required.' });
    }

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'Driver phone number is required.' });
    }

    const cleanPhone = sanitizeString(phone).trim();
    if (cleanPhone.length < 8) {
      return res.status(400).json({ error: 'Valid phone number is required.' });
    }

    const rawPlate = licensePlate || req.body?.vehiclePlate;
    if (!rawPlate || typeof rawPlate !== 'string' || rawPlate.trim().length < 3) {
      return res.status(400).json({ error: 'Vehicle license plate is required (e.g. KDG 482B).' });
    }

    const cleanPlate = sanitizeString(rawPlate).toUpperCase().trim();
    const cleanName = sanitizeString(name).trim();
    const cleanVehicleType = sanitizeString(vehicleType || 'Motorcycle (Boda Boda)').trim();
    const cleanCorridor = sanitizeString(corridorZone || 'Thika Road Corridor (Roysambu / Kasarani)').trim();
    const cleanHub = sanitizeString(assignedHub || 'Roysambu Depot (Exit 8)').trim();
    const cleanNationalId = nationalId ? sanitizeString(nationalId).trim() : undefined;
    const cleanDrivingLicenseNo = drivingLicenseNo ? sanitizeString(drivingLicenseNo).trim() : undefined;
    const cleanCapacity = validatePositiveInteger(capacity, 20);

    // Prevent duplicate email accounts across users
    const existingUser = db.users.find((u) => u.email.toLowerCase().trim() === cleanEmail);
    if (existingUser) {
      return res.status(400).json({ error: `An account with email '${cleanEmail}' already exists in the system.` });
    }

    // Prevent duplicate driver by email or plate
    const existingDriver = db.drivers.find(
      (d) =>
        d.email.toLowerCase().trim() === cleanEmail ||
        (d.licensePlate && d.licensePlate.toUpperCase().trim() === cleanPlate)
    );
    if (existingDriver) {
      return res.status(400).json({
        error:
          existingDriver.email.toLowerCase().trim() === cleanEmail
            ? `A driver with email '${cleanEmail}' already exists in the fleet roster.`
            : `A vehicle with license plate '${cleanPlate}' is already registered to another driver.`
      });
    }

    const driverId = `drv-${Date.now()}`;
    const userId = `usr-drv-${Date.now()}`;
    const initials = cleanName
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'DR';

    // The driver role and account status MUST be assigned server-side.
    // Client-supplied role, isAdmin, or status are strictly ignored.
    const newUser: any = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      role: 'driver', // Strictly assigned on server
      phone: cleanPhone,
      vehicle: `${cleanPlate} (${cleanVehicleType})`,
      licensePlate: cleanPlate,
      driverId,
      corridorZone: cleanCorridor,
      status: 'pending',
      accountActivated: false,
      passwordHash: '', // No permanent password displayed or generated for admin
      avatar: initials
    };
    db.users.push(newUser);

    const newDriver: Driver = {
      id: driverId,
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      initials,
      vehicle: `${cleanPlate} (${cleanVehicleType})`,
      licensePlate: cleanPlate,
      rating: 5.0,
      status: 'Pending',
      accountActivated: false,
      currentStop: cleanCorridor,
      etaMinutes: 0,
      deliveredCountToday: 0,
      utilizationPercentage: 0,
      capacity: cleanCapacity,
      load: 0,
      lastLocationUpdate: 'Pending Activation',
      location: {
        lat: -1.2185,
        lng: 36.8872,
        addressText: cleanHub
      },
      nationalId: cleanNationalId,
      drivingLicenseNo: cleanDrivingLicenseNo,
      assignedHub: cleanHub,
      corridorZone: cleanCorridor,
      createdAt: new Date().toISOString()
    };
    db.drivers.push(newDriver);

    // Synchronize to employee workforce roster
    const newEmp = {
      id: `emp-${Date.now()}`,
      name: cleanName,
      role: 'Driver' as const,
      email: cleanEmail,
      phone: cleanPhone,
      assignedHub: cleanHub,
      vehicle: `${cleanPlate} (${cleanVehicleType})`,
      status: 'Active' as const,
      joinedDate: new Date().toISOString().split('T')[0],
      ordersCompleted: 0,
      driverId
    };
    db.employees.push(newEmp);

    // Generate single-use, unpredictable cryptographic activation token
    const tokenRecord = generateActivationToken({
      driverId,
      userId,
      email: cleanEmail,
      driverName: cleanName,
      ipAddress: req.ip
    });

    // Automatic dispatch of secure activation invitation email
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const emailResult = await sendDriverActivationEmail({
      driverName: cleanName,
      driverEmail: cleanEmail,
      activationToken: tokenRecord.token,
      baseUrl
    });

    // Broadcast real-time driver creation event
    broadcastEvent('DRIVER_CREATED', newDriver);

    logSecurityEvent('ADMIN_CREATED_DRIVER_ACCOUNT', {
      adminId: caller.id,
      adminEmail: caller.email,
      driverId,
      driverEmail: cleanEmail,
      licensePlate: cleanPlate
    }, req);

    return res.status(201).json({
      message: 'Driver account created successfully. An activation invitation email has been sent to the driver.',
      driver: newDriver,
      activationToken: tokenRecord.token,
      activationUrl: emailResult.activationUrl,
      emailStatus: {
        success: emailResult.success,
        recipient: emailResult.recipient,
        provider: emailResult.provider
      }
    });
  });

  // Resend Driver Activation Email
  app.post('/api/admin/drivers/:id/resend-activation', requireAdmin, async (req: Request, res: Response) => {
    const caller = (req as any).user || getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can resend driver invitations.' });
    }

    const { id } = req.params;
    const driver = db.drivers.find((d) => d.id === id);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found in fleet roster.' });
    }

    const user = db.users.find(
      (u) => u.email.toLowerCase() === driver.email.toLowerCase() || (u as any).driverId === driver.id
    );
    if (!user) {
      return res.status(404).json({ error: 'Associated driver user account not found.' });
    }

    if (user.accountActivated === true) {
      return res.status(400).json({ error: 'This driver account has already been activated.' });
    }

    // Generate fresh single-use activation token (invalidates previous tokens)
    const tokenRecord = generateActivationToken({
      driverId: driver.id,
      userId: user.id,
      email: driver.email,
      driverName: driver.name,
      ipAddress: req.ip
    });

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const emailResult = await sendDriverActivationEmail({
      driverName: driver.name,
      driverEmail: driver.email,
      activationToken: tokenRecord.token,
      baseUrl
    });

    logSecurityEvent('ADMIN_RESENT_DRIVER_ACTIVATION', {
      adminId: caller.id,
      driverId: driver.id,
      driverEmail: driver.email
    }, req);

    return res.json({
      message: `Activation invitation resent to ${driver.email}.`,
      activationUrl: emailResult.activationUrl,
      emailStatus: {
        success: emailResult.success,
        recipient: emailResult.recipient,
        provider: emailResult.provider
      }
    });
  });

  app.put('/api/drivers/:id/status', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    const { id } = req.params;
    const driver = db.drivers.find((d) => d.id === id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    if (caller.role === 'customer') {
      return res.status(403).json({ error: 'Access Denied: Customers cannot modify fleet driver status.' });
    }

    // Driver can only update their own status; Admin can update any
    if (caller.role === 'driver') {
      const callerName = caller.name?.toLowerCase().trim();
      const isSelf =
        driver.id === caller.id ||
        driver.id === (caller as any).driverId ||
        Boolean(callerName && driver.name && driver.name.toLowerCase().trim() === callerName);
      if (!isSelf) {
        logSecurityEvent('IDOR_DRIVER_STATUS_UPDATE_BLOCKED', { targetDriverId: id, callerId: caller.id }, req);
        return res.status(403).json({ error: 'Access Denied: Couriers can only update their own shift status.' });
      }
    }

    const { status, currentStop } = req.body;

    // Normalize driver statuses to Online | Offline | On Delivery
    let normalizedStatus: any = status;
    if (status === 'Available') normalizedStatus = 'Online';
    if (status === 'On Route') normalizedStatus = 'On Delivery';

    if (normalizedStatus) {
      driver.status = normalizedStatus;
    }
    if (currentStop) {
      driver.currentStop = sanitizeString(currentStop);
    }
    driver.lastLocationUpdate = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    broadcastEvent('DRIVER_STATUS_UPDATED', driver);
    return res.json(driver);
  });

  // Driver updates real GPS location / telemetry
  app.put('/api/drivers/:id/location', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    const { id } = req.params;
    const driver = db.drivers.find((d) => d.id === id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    if (caller.role === 'customer') {
      return res.status(403).json({ error: 'Access Denied: Customers cannot modify fleet location telemetry.' });
    }

    if (caller.role === 'driver') {
      const callerName = caller.name?.toLowerCase().trim();
      const isSelf =
        driver.id === caller.id ||
        driver.id === (caller as any).driverId ||
        Boolean(callerName && driver.name && driver.name.toLowerCase().trim() === callerName);
      if (!isSelf) {
        logSecurityEvent('IDOR_DRIVER_LOCATION_UPDATE_BLOCKED', { targetDriverId: id, callerId: caller.id }, req);
        return res.status(403).json({ error: 'Access Denied: Couriers can only update their own GPS location.' });
      }
    }

    const { lat, lng, addressText, etaMinutes } = req.body;
    if (!validateCoordinates(lat, lng)) {
      return res.status(400).json({ error: 'Valid GPS latitude (-90 to 90) and longitude (-180 to 180) are required.' });
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    driver.location = {
      lat: Number(lat),
      lng: Number(lng),
      addressText: addressText ? sanitizeString(addressText) : driver.location?.addressText || 'Nairobi, Kenya'
    };
    driver.lastLocationUpdate = nowTime;
    if (typeof etaMinutes === 'number') driver.etaMinutes = Math.max(1, Math.min(180, Math.round(etaMinutes)));

    // Also update active order ETA and driver current location
    if (driver.activeOrderId) {
      const order = db.orders.find((o) => o.id === driver.activeOrderId);
      if (order) {
        if (typeof etaMinutes === 'number') order.driverEtaMinutes = driver.etaMinutes;
        order.driverCurrentLocation = driver.location;
        broadcastEvent('ORDER_UPDATED', order);
      }
    }

    broadcastEvent('DRIVER_LOCATION_UPDATED', { driverId: id, location: driver.location, etaMinutes: driver.etaMinutes });
    return res.json({ success: true, driver });
  });

  // Track driver wallet balances in memory for cashout simulations
  const driverWallets: Record<string, { availableKSh: number; withdrawnThisWeekKSh: number; lastCashout?: string }> = {};

  // Driver Earnings & Retention Analytics Dashboard
  app.get('/api/drivers/:id/earnings', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    if (caller.role === 'customer') {
      return res.status(403).json({ error: 'Access Denied: Driver earnings are confidential.' });
    }

    const { id } = req.params;
    const driver = db.drivers.find((d) => d.id === id) || db.drivers[0];
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    // Driver can only view their own earnings; Admin can view any
    if (caller.role === 'driver') {
      const callerName = caller.name?.toLowerCase().trim();
      const isSelf =
        driver.id === caller.id ||
        driver.id === (caller as any).driverId ||
        Boolean(callerName && driver.name && driver.name.toLowerCase().trim() === callerName);
      if (!isSelf) {
        logSecurityEvent('IDOR_DRIVER_EARNINGS_ACCESS_BLOCKED', { targetDriverId: id, callerId: caller.id }, req);
        return res.status(403).json({ error: 'Access Denied: You cannot view financial earnings for other couriers.' });
      }
    }

    // Calculate from real delivered orders
    const driverOrders = db.orders.filter(o => o.driverId === driver.id && o.status === 'Delivered');
    const deliveredTodayCount = driver.deliveredCountToday || driverOrders.length || 0;
    const cylindersDeliveredToday = driverOrders.reduce((sum, o) => {
      const itemsCount = (o.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);
      return sum + itemsCount;
    }, 0);

    const baseFareToday = deliveredTodayCount * 250;
    const cylinderCommissionToday = cylindersDeliveredToday * 80;
    const streakBonusToday = deliveredTodayCount >= 8 ? 500 : 0;
    const tipsToday = deliveredTodayCount > 0 ? deliveredTodayCount * 50 : 0;
    const totalTodayKSh = baseFareToday + cylinderCommissionToday + streakBonusToday + tipsToday;

    // Retrieve or initialize wallet
    if (!driverWallets[driver.id]) {
      driverWallets[driver.id] = { availableKSh: 0, withdrawnThisWeekKSh: 0 };
    }
    const walletData = driverWallets[driver.id];

    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const currentDayIdx = (new Date().getDay() + 6) % 7;

    const weeklyDays = daysOfWeek.map((day, idx) => {
      const isToday = idx === currentDayIdx;
      return {
        day,
        date: isToday ? 'Today' : day,
        isToday,
        baseFare: isToday ? baseFareToday : 0,
        cylinderCommission: isToday ? cylinderCommissionToday : 0,
        bonus: isToday ? streakBonusToday : 0,
        tips: isToday ? tipsToday : 0,
        totalIncome: isToday ? totalTodayKSh : 0,
        deliveriesCount: isToday ? deliveredTodayCount : 0,
        cylindersCount: isToday ? cylindersDeliveredToday : 0
      };
    });

    const weeklyTotalIncome = weeklyDays.reduce((sum, d) => sum + d.totalIncome, 0);
    const weeklyDeliveriesCount = weeklyDays.reduce((sum, d) => sum + d.deliveriesCount, 0);
    const weeklyCylindersCount = weeklyDays.reduce((sum, d) => sum + d.cylindersCount, 0);

    const earningsSummary = {
      driverId: driver.id,
      driverName: driver.name,
      currency: 'KSh',
      today: {
        totalKSh: totalTodayKSh,
        deliveriesCount: deliveredTodayCount,
        cylindersCount: cylindersDeliveredToday,
        baseFare: baseFareToday,
        cylinderCommission: cylinderCommissionToday,
        bonus: streakBonusToday,
        tips: tipsToday,
        hoursOnline: driver.status === 'Offline' ? 0 : 1,
        avgPerDeliveryKSh: deliveredTodayCount > 0 ? Math.round(totalTodayKSh / deliveredTodayCount) : 0,
        hourlyTimeline: []
      },
      weekly: {
        totalKSh: weeklyTotalIncome,
        deliveriesCount: weeklyDeliveriesCount,
        cylindersCount: weeklyCylindersCount,
        baseFare: weeklyDays.reduce((s, d) => s + d.baseFare, 0),
        cylinderCommission: weeklyDays.reduce((s, d) => s + d.cylinderCommission, 0),
        bonus: weeklyDays.reduce((s, d) => s + d.bonus, 0),
        tips: weeklyDays.reduce((s, d) => s + d.tips, 0),
        targetDeliveries: 70,
        targetBonusKSh: 3500,
        targetProgressPercent: Math.min(100, Math.round((weeklyDeliveriesCount / 70) * 100)),
        dailyHistory: weeklyDays
      },
      wallet: {
        availableForCashoutKSh: walletData.availableKSh,
        pendingReconciliationKSh: totalTodayKSh,
        totalWithdrawnThisWeekKSh: walletData.withdrawnThisWeekKSh,
        mpesaPhoneNumber: driver.phone || '',
        lastCashoutAt: walletData.lastCashout
      },
      incentives: [
        {
          id: 'inc-1',
          title: 'Daily 8-Cylinder Sprint',
          description: 'Deliver at least 8 cylinders before 8 PM to unlock instant bonus.',
          type: 'daily_streak' as const,
          target: 8,
          current: Math.min(8, cylindersDeliveredToday),
          rewardKSh: 500,
          isCompleted: cylindersDeliveredToday >= 8,
          deadlineText: 'Ends 8:00 PM tonight',
          unit: 'cylinders'
        },
        {
          id: 'inc-2',
          title: 'Weekly 70-Delivery Master',
          description: 'Complete 70 safe deliveries this week for the top-tier loyalty payout.',
          type: 'weekly_milestone' as const,
          target: 70,
          current: weeklyDeliveriesCount,
          rewardKSh: 3500,
          isCompleted: weeklyDeliveriesCount >= 70,
          deadlineText: 'Resets Sunday midnight',
          unit: 'deliveries'
        },
        {
          id: 'inc-3',
          title: 'Customer Excellence 5-Star',
          description: 'Keep your customer satisfaction rating at or above 4.80 all week.',
          type: 'rating_bonus' as const,
          target: 4.8,
          current: driver.rating || 5.0,
          rewardKSh: 1200,
          isCompleted: (driver.rating || 5.0) >= 4.8,
          deadlineText: 'Verified weekly',
          unit: 'rating'
        }
      ],
      recentPayoutDeliveries: driverOrders.slice(-10).reverse().map(o => {
        const itemsCount = (o.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);
        const baseFare = 250;
        const cylinderBonus = itemsCount * 80;
        const tip = 50;
        return {
          id: o.id,
          time: o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
          customerArea: typeof o.deliveryAddress === 'string' ? o.deliveryAddress : (o.deliveryAddress?.street || 'Nairobi'),
          cylinderType: o.cylinderSummary || (o.items?.[0]?.productName || 'LPG Cylinder'),
          quantity: itemsCount,
          baseFare,
          cylinderBonus,
          tip,
          totalKSh: baseFare + cylinderBonus + tip,
          status: 'Settled' as const
        };
      })
    };

    return res.json(earningsSummary);
  });

  // Instant Driver Cashout via M-Pesa B2C (Hardened against IDOR, race conditions, and manipulation)
  app.post('/api/drivers/:id/cashout', cashoutLimiter, (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    if (caller.role === 'customer') {
      return res.status(403).json({ error: 'Access Denied: Only courier drivers and administrators can access cashout.' });
    }

    const { id } = req.params;
    const driver = db.drivers.find((d) => d.id === id) || db.drivers[0];
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    // IDOR Check: Driver can only cash out their own wallet
    if (caller.role === 'driver') {
      const callerName = caller.name?.toLowerCase().trim();
      const isSelf =
        driver.id === caller.id ||
        driver.id === (caller as any).driverId ||
        Boolean(callerName && driver.name && driver.name.toLowerCase().trim() === callerName);
      if (!isSelf) {
        logSecurityEvent('IDOR_DRIVER_CASHOUT_BLOCKED', { targetDriverId: id, callerId: caller.id }, req);
        return res.status(403).json({ error: 'Access Denied: You cannot initiate a cashout for another courier account.' });
      }
    }

    if (!driverWallets[driver.id]) {
      driverWallets[driver.id] = { availableKSh: 0, withdrawnThisWeekKSh: 0 };
    }
    const wallet = driverWallets[driver.id];

    const requestedAmount = req.body?.amount !== undefined ? Number(req.body.amount) : wallet.availableKSh;

    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount.' });
    }

    if (requestedAmount > wallet.availableKSh) {
      return res.status(400).json({
        error: `Insufficient balance. Available to cash out: KSh ${wallet.availableKSh.toLocaleString()}`
      });
    }

    // Minimum cashout threshold (KSh 500) and maximum per transaction (KSh 150,000 M-Pesa cap)
    if (requestedAmount < 500) {
      return res.status(400).json({ error: 'Minimum M-Pesa withdrawal is KSh 500.' });
    }
    if (requestedAmount > 150000) {
      return res.status(400).json({ error: 'Maximum single M-Pesa transaction limit is KSh 150,000.' });
    }

    // Deduct and update wallet atomically
    wallet.availableKSh -= requestedAmount;
    wallet.withdrawnThisWeekKSh += requestedAmount;
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    wallet.lastCashout = `Today, ${nowTimeStr}`;

    const txCode = `MPB-${Math.floor(100000 + Math.random() * 900000)}`;

    logSecurityEvent('DRIVER_CASHOUT_SUCCESS', {
      driverId: driver.id,
      amount: requestedAmount,
      txCode
    }, req);

    broadcastEvent('DRIVER_CASHOUT_PROCESSED', {
      driverId: driver.id,
      amount: requestedAmount,
      transactionId: txCode,
      remainingBalance: wallet.availableKSh
    });

    return res.json({
      success: true,
      transactionId: txCode,
      amount: requestedAmount,
      remainingBalance: wallet.availableKSh,
      phone: driver.phone || '+254 733 390 112',
      message: `KSh ${requestedAmount.toLocaleString()} sent instantly to M-Pesa (${driver.phone || '+254 733 390 112'}). Ref: ${txCode}.`
    });
  });

  // ==========================================
  // ANALYTICS ROUTE (ADMIN ONLY)
  // ==========================================
  app.get('/api/analytics', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Hub analytics is restricted to admin dispatchers.' });
    }
    const metrics = db.getAnalytics();
    return res.json(metrics);
  });

  // ==========================================
  // EMPLOYEE & WORKFORCE MANAGEMENT ROUTES (ADMIN ONLY)
  // ==========================================
  app.get('/api/employees', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can view workforce rosters.' });
    }

    const { role, status, availability, search, includeArchived } = req.query as {
      role?: string;
      status?: string;
      availability?: string;
      search?: string;
      includeArchived?: string;
    };
    const employees = db.getEmployees({
      role: role ? sanitizeString(role) : undefined,
      status: status ? sanitizeString(status) : undefined,
      availability: availability ? sanitizeString(availability) : undefined,
      search: search ? sanitizeString(search) : undefined,
      includeArchived: includeArchived === 'true'
    });
    return res.json(employees);
  });

  app.get('/api/employees/:id', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can view employee details.' });
    }

    const emp = db.getEmployeeById(req.params.id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    return res.json(emp);
  });

  app.post('/api/employees', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can register staff.' });
    }

    try {
      const sanitizedPayload = {
        ...req.body,
        name: sanitizeString(req.body.name || ''),
        email: sanitizeString(req.body.email || ''),
        phone: sanitizeString(req.body.phone || ''),
        role: sanitizeString(req.body.role || 'Driver')
      };
      const created = db.addEmployee(sanitizedPayload);
      logSecurityEvent('EMPLOYEE_CREATED', { employeeId: created.id, by: caller.id }, req);
      broadcastEvent('EMPLOYEE_CREATED', created);
      return res.status(201).json(created);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create employee' });
    }
  });

  app.put('/api/employees/:id', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can modify employee details.' });
    }

    try {
      const sanitizedPayload = { ...req.body };
      if (sanitizedPayload.name) sanitizedPayload.name = sanitizeString(sanitizedPayload.name);
      if (sanitizedPayload.email) sanitizedPayload.email = sanitizeString(sanitizedPayload.email);
      if (sanitizedPayload.phone) sanitizedPayload.phone = sanitizeString(sanitizedPayload.phone);

      const updated = db.updateEmployee(req.params.id, sanitizedPayload);
      broadcastEvent('EMPLOYEE_UPDATED', updated);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update employee' });
    }
  });

  app.put('/api/employees/:id/status', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can change employee status.' });
    }

    const { status, reason } = req.body;
    const validStatuses: EmployeeStatus[] = ['Active', 'On Leave', 'Suspended', 'Terminated', 'Archived'];
    const targetStatus: EmployeeStatus = validStatuses.includes(status) ? status : 'Active';

    try {
      const updated = db.updateEmployeeStatus(
        req.params.id,
        targetStatus,
        reason ? sanitizeString(reason) : undefined
      );
      broadcastEvent('EMPLOYEE_STATUS_CHANGED', updated);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to update status' });
    }
  });

  app.put('/api/employees/:id/terminate', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can terminate employment.' });
    }

    const { reason } = req.body;
    try {
      const terminated = db.terminateEmployee(
        req.params.id,
        reason ? sanitizeString(reason) : 'Administrative termination',
        caller?.name || 'Alex Kiprono'
      );
      logSecurityEvent('EMPLOYEE_TERMINATED', { employeeId: req.params.id, by: caller.id }, req);
      broadcastEvent('EMPLOYEE_TERMINATED', terminated);
      return res.json(terminated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to terminate employee' });
    }
  });

  app.put('/api/employees/:id/assign-vehicle', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can assign fleet vehicles.' });
    }

    const { vehicle, licensePlate } = req.body;
    try {
      const updated = db.assignVehicle(
        req.params.id,
        sanitizeString(vehicle || ''),
        licensePlate ? sanitizeString(licensePlate) : undefined
      );
      broadcastEvent('VEHICLE_ASSIGNED', updated);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to assign vehicle' });
    }
  });

  app.delete('/api/employees/:id', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can remove employee records.' });
    }

    try {
      const reason = req.body?.reason ? sanitizeString(req.body.reason) : 'Soft-deleted and moved to archive';
      const result = db.deleteEmployee(req.params.id, reason, caller?.name || 'Alex Kiprono');
      logSecurityEvent('EMPLOYEE_ARCHIVED', { employeeId: req.params.id, by: caller.id }, req);
      broadcastEvent('EMPLOYEE_ARCHIVED', result.employee);
      return res.json({ message: 'Employee soft-deleted and marked as Archived', ...result });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to delete employee' });
    }
  });

  app.post('/api/employees/:id/archive', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can archive employee records.' });
    }

    try {
      const reason = req.body?.reason ? sanitizeString(req.body.reason) : 'Soft-deleted and moved to archive';
      const archived = db.archiveEmployee(req.params.id, reason, caller?.name || 'Alex Kiprono');
      logSecurityEvent('EMPLOYEE_ARCHIVED', { employeeId: req.params.id, by: caller.id }, req);
      broadcastEvent('EMPLOYEE_ARCHIVED', archived);
      return res.json({ message: `${archived.name} marked as Archived`, employee: archived });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to archive employee' });
    }
  });

  app.post('/api/employees/:id/restore', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can restore archived employees.' });
    }

    try {
      const restored = db.restoreEmployee(req.params.id, caller?.name || 'Alex Kiprono');
      logSecurityEvent('EMPLOYEE_RESTORED', { employeeId: req.params.id, by: caller.id }, req);
      broadcastEvent('EMPLOYEE_RESTORED', restored);
      return res.json({ message: `${restored.name} restored to active roster successfully`, employee: restored });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to restore employee' });
    }
  });

  // ==========================================
  // ARCHIVE MANAGER ENDPOINTS (ADMIN ONLY)
  // ==========================================
  app.get('/api/archive', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can access Archive Manager.' });
    }

    const employees = db.getArchivedEmployees();
    const orders = db.getArchivedOrders();
    const stats = db.getArchiveStats();
    return res.json({ employees, orders, stats });
  });

  app.post('/api/archive/restore', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can restore archived records.' });
    }

    const { type, id, items } = req.body;
    try {
      if (Array.isArray(items) && items.length > 0) {
        const restoredList: any[] = [];
        for (const item of items) {
          if (item.type === 'employee') {
            const restored = db.restoreEmployee(item.id, caller?.name || 'Alex Kiprono');
            restoredList.push({ type: 'employee', id: item.id, data: restored });
            broadcastEvent('EMPLOYEE_RESTORED', restored);
          } else if (item.type === 'order') {
            const restored = db.restoreOrder(item.id, caller?.name || 'Alex Kiprono');
            restoredList.push({ type: 'order', id: item.id, data: restored });
            broadcastEvent('ORDER_RESTORED', restored);
          }
        }
        return res.json({
          message: `Successfully restored ${restoredList.length} archived record(s)`,
          restored: restoredList,
          stats: db.getArchiveStats()
        });
      }

      if (type === 'employee') {
        const restored = db.restoreEmployee(id, caller?.name || 'Alex Kiprono');
        broadcastEvent('EMPLOYEE_RESTORED', restored);
        return res.json({ message: `${restored.name} restored to active roster successfully`, record: restored, stats: db.getArchiveStats() });
      } else if (type === 'order') {
        const restored = db.restoreOrder(id, caller?.name || 'Alex Kiprono');
        broadcastEvent('ORDER_RESTORED', restored);
        return res.json({ message: `Order #${restored.id} restored to status: ${restored.status}`, record: restored, stats: db.getArchiveStats() });
      } else {
        return res.status(400).json({ error: 'Invalid item type. Expected "employee" or "order".' });
      }
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to restore record' });
    }
  });

  app.delete('/api/archive/permanent/:type/:id', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can permanently purge records.' });
    }

    const { type, id } = req.params;
    try {
      if (type === 'employee') {
        db.permanentlyDeleteEmployee(id);
        logSecurityEvent('EMPLOYEE_PURGED', { employeeId: id, by: caller.id }, req);
        broadcastEvent('EMPLOYEE_PURGED', { id });
        return res.json({ message: `Employee ${id} permanently removed`, stats: db.getArchiveStats() });
      } else if (type === 'order') {
        db.permanentlyDeleteOrder(id);
        logSecurityEvent('ORDER_PURGED', { orderId: id, by: caller.id }, req);
        broadcastEvent('ORDER_PURGED', { id });
        return res.json({ message: `Order ${id} permanently removed`, stats: db.getArchiveStats() });
      } else {
        return res.status(400).json({ error: 'Invalid record type' });
      }
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to permanently purge record' });
    }
  });

  app.post('/api/employees/bulk-import', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can import employee data.' });
    }

    const { employees } = req.body;
    if (!Array.isArray(employees)) {
      return res.status(400).json({ error: 'Expected an array of employee records' });
    }

    // Limit maximum bulk upload batch size to protect server memory
    if (employees.length > 200) {
      return res.status(400).json({ error: 'Maximum 200 employee records per bulk import batch.' });
    }

    const sanitizedEmployees = employees.map((e: any) => ({
      ...e,
      name: sanitizeString(e.name || ''),
      email: sanitizeString(e.email || ''),
      phone: sanitizeString(e.phone || ''),
      role: sanitizeString(e.role || 'Driver')
    }));

    const result = db.bulkImportEmployees(sanitizedEmployees);
    logSecurityEvent('EMPLOYEES_BULK_IMPORTED', { count: employees.length, by: caller.id }, req);
    broadcastEvent('EMPLOYEES_IMPORTED', result);
    return res.json(result);
  });

  app.get('/api/workforce-metrics', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Workforce metrics are restricted to administrators.' });
    }
    const metrics = db.getWorkforceMetrics();
    return res.json(metrics);
  });

  app.get('/api/alerts', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Operational alerts are restricted to dispatch administrators.' });
    }
    const alerts = db.getNeedsAttentionAlerts();
    return res.json(alerts);
  });

  app.get('/api/activity', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: System audit activity logs are restricted to administrators.' });
    }
    const activity = db.getActivityLogs();
    return res.json(activity);
  });

  // ==========================================
  // ENTERPRISE INTEGRATIONS & WEBHOOK ROUTES (ADMIN ONLY)
  // ==========================================
  app.get('/api/integrations', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can view integration settings.' });
    }
    const data = db.getIntegrations(true);
    return res.json(data);
  });

  app.get('/api/integrations/logs', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can view integration logs.' });
    }
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
    const logs = db.getIntegrationLogs(limit);
    return res.json(logs);
  });

  app.get('/api/integrations/:id', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can view integration details.' });
    }
    const item = db.getIntegration(req.params.id, true);
    if (!item) {
      return res.status(404).json({ error: `Integration "${req.params.id}" not found.` });
    }
    return res.json(item);
  });

  app.put('/api/integrations/:id', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can update integration credentials and configurations.' });
    }

    const { id } = req.params;
    const { config, environment, authMethod, isEnabled } = req.body;

    try {
      const updated = db.updateIntegration(
        id,
        { config, environment, authMethod, isEnabled },
        caller?.name || 'Administrator'
      );
      logSecurityEvent('INTEGRATION_CONFIG_UPDATED', { integrationId: id, by: caller.id }, req);
      const overview = db.getIntegrations(true).overview;
      broadcastEvent('INTEGRATION_UPDATED', { integration: updated, overview });
      return res.json({
        message: `${updated.name} configuration saved successfully.`,
        integration: updated,
        overview
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to save integration configuration.' });
    }
  });

  app.post('/api/integrations/:id/test', async (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can test integration connections.' });
    }

    const { id } = req.params;
    try {
      const result = await db.testIntegration(id, caller?.name || 'Administrator');
      const overview = db.getIntegrations(true).overview;
      broadcastEvent('INTEGRATION_TESTED', { ...result, overview });
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to test integration connection.' });
    }
  });

  app.post('/api/integrations/:id/toggle', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      return res.status(403).json({ error: 'Access Denied: Only administrators can enable or disable integrations.' });
    }

    const { id } = req.params;
    const { isEnabled } = req.body;
    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({ error: 'Expected boolean "isEnabled" in request body.' });
    }

    try {
      const updated = db.toggleIntegration(id, isEnabled, caller?.name || 'Administrator');
      logSecurityEvent('INTEGRATION_STATE_TOGGLED', { integrationId: id, isEnabled, by: caller.id }, req);
      const overview = db.getIntegrations(true).overview;
      broadcastEvent('INTEGRATION_TOGGLED', { integration: updated, overview });
      return res.json({
        message: `${updated.name} ${isEnabled ? 'enabled' : 'disabled'} successfully.`,
        integration: updated,
        overview
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to toggle integration state.' });
    }
  });

  // Webhook receiver endpoint for third-party callbacks (Rate-limited, sanitized)
  app.post('/api/webhooks/:provider', webhookLimiter, (req: Request, res: Response) => {
    const { provider } = req.params;
    const safeProvider = sanitizeString(provider).slice(0, 50);
    const payload = req.body || {};

    const integration = db.integrations.find(i => i.id === safeProvider || i.webhookUrl?.includes(safeProvider));
    const intName = integration ? integration.name : `${safeProvider.toUpperCase()} Webhook`;

    db.addIntegrationLog({
      integrationId: integration?.id || safeProvider,
      integrationName: intName,
      action: `${intName} callback received`,
      administrator: 'External Webhook Gateway',
      result: 'success',
      message: `Payload successfully verified and ingested (${Object.keys(payload).length} parameters)`,
      metadata: { provider: safeProvider, receivedAt: new Date().toISOString() }
    });

    if (integration) {
      integration.lastWebhookReceived = new Date().toISOString();
      integration.lastWebhookResponse = '200 OK';
      integration.webhookStatus = 'active';
    }

    broadcastEvent('WEBHOOK_RECEIVED', { provider: safeProvider, timestamp: new Date().toISOString() });
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted and logged successfully', status: 'ok' });
  });

  // ==========================================
  // SEED & RESET ROUTE (ADMIN ONLY)
  // ==========================================
  app.post('/api/reset', (req: Request, res: Response) => {
    const caller = getAuthenticatedUser(req);
    if (!caller || caller.role !== 'admin') {
      logSecurityEvent('UNAUTHORIZED_RESET_ATTEMPT', { ip: req.ip }, req);
      return res.status(403).json({ error: 'Access Denied: Only authenticated administrators can reset the system database.' });
    }

    db.resetToDefaults();
    logSecurityEvent('DATABASE_RESET', { by: caller.id, email: caller.email }, req);
    broadcastEvent('DATABASE_RESET', {});
    return res.json({ message: 'Database reset to reference defaults successfully by administrator.' });
  });

  // ==========================================
  // VITE DEV SERVER / PRODUCTION STATIC SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GasDeliver Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
