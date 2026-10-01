import { User, Product, Order, Driver, DashboardMetrics, OrderStatus, Employee, WorkforceMetrics, NeedsAttentionAlert, ActivityItem, ArchiveStats, ArchiveResponse, DriverEarningsSummary, GasBrandItem, IntegrationItem, IntegrationLog, IntegrationsOverview, CustomerRecord, DriverApplication } from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  let token = localStorage.getItem('gasdeliver_token');
  if (!token) {
    const cachedUser = localStorage.getItem('gasdeliver_user');
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        if (u && u.role) {
          const devPayload = {
            id: u.id || `dev-${u.role}`,
            email: u.email || `${u.role}@gasdeliver.co.ke`,
            role: u.role,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 86400 * 7
          };
          token = btoa(JSON.stringify(devPayload));
          localStorage.setItem('gasdeliver_token', token);
        }
      } catch {
        // ignore
      }
    }
  }
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Auth
  async login(email: string, password: string, role?: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(data.error || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('gasdeliver_token', data.token);
    localStorage.setItem('gasdeliver_user', JSON.stringify(data.user));
    return data;
  },

  async register(data: {
    name: string;
    email: string;
    password?: string;
    confirmPassword?: string;
    role?: string;
    phone?: string;
    address?: string;
    corridorZone?: string;
  }): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(err.error || 'Registration failed');
    }
    const resData = await res.json();
    localStorage.setItem('gasdeliver_token', resData.token);
    localStorage.setItem('gasdeliver_user', JSON.stringify(resData.user));
    return resData;
  },

  async applyAsDriver(data: {
    fullName: string;
    email: string;
    phone: string;
    password?: string;
    confirmPassword?: string;
    corridorZone: string;
    vehicleMake: string;
    vehicleModel: string;
    licensePlate: string;
    vehicleType?: string;
    experienceYears?: number;
    nationalIdNumber: string;
    nationalIdDocumentUrl?: string;
    driverLicenseNumber: string;
    driverLicenseDocumentUrl?: string;
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  }): Promise<{ success: boolean; application: DriverApplication; message: string }> {
    const res = await fetch(`${API_BASE}/auth/driver-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Driver registration failed' }));
      throw new Error(err.error || 'Driver registration failed');
    }
    return res.json();
  },

  // Driver Verifications (Admin)
  async getDriverVerifications(status?: string): Promise<DriverApplication[]> {
    const query = status && status !== 'all' ? `?status=${status}` : '';
    const res = await fetch(`${API_BASE}/admin/driver-verifications${query}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to load driver verification queue');
    return res.json();
  },

  async approveDriverVerification(id: string, notes?: string): Promise<{ success: boolean; application: DriverApplication; driver?: Driver; message: string }> {
    const res = await fetch(`${API_BASE}/admin/driver-verifications/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to approve driver' }));
      throw new Error(err.error || 'Failed to approve driver');
    }
    return res.json();
  },

  async rejectDriverVerification(id: string, reason: string): Promise<{ success: boolean; application: DriverApplication; message: string }> {
    const res = await fetch(`${API_BASE}/admin/driver-verifications/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to reject driver application' }));
      throw new Error(err.error || 'Failed to reject driver application');
    }
    return res.json();
  },

  async suspendDriverVerification(id: string, reason: string): Promise<{ success: boolean; application: DriverApplication; message: string }> {
    const res = await fetch(`${API_BASE}/admin/driver-verifications/${id}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to suspend driver' }));
      throw new Error(err.error || 'Failed to suspend driver');
    }
    return res.json();
  },

  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('gasdeliver_token');
    const cached = localStorage.getItem('gasdeliver_user');
    if (!token && !cached) return null;

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getAuthHeader()
      });
      if (!res.ok) {
        if (res.status === 401 && !import.meta.env.DEV) {
          localStorage.removeItem('gasdeliver_token');
          localStorage.removeItem('gasdeliver_user');
          return null;
        }
        return cached ? JSON.parse(cached) : null;
      }
      const data = await res.json();
      if (data.user) {
        localStorage.setItem('gasdeliver_user', JSON.stringify(data.user));
        return data.user;
      }
      return cached ? JSON.parse(cached) : null;
    } catch {
      return cached ? JSON.parse(cached) : null;
    }
  },

  logout(): void {
    localStorage.removeItem('gasdeliver_token');
    localStorage.removeItem('gasdeliver_user');
  },

  // Products
  async getProducts(gasType?: string): Promise<Product[]> {
    const query = gasType && gasType !== 'All' ? `?gasType=${gasType}` : '';
    const res = await fetch(`${API_BASE}/products${query}`);
    if (!res.ok) throw new Error('Failed to load products');
    return res.json();
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update product');
    return res.json();
  },

  async createProduct(product: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(product)
    });
    if (!res.ok) throw new Error('Failed to create product');
    return res.json();
  },

  async deleteProduct(id: string, reason?: string): Promise<{ success: boolean; product: Product; message: string }> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Failed to delete product' }));
      throw new Error(data.error || 'Failed to delete product');
    }
    return res.json();
  },

  async restoreProduct(id: string): Promise<{ success: boolean; product: Product; message: string }> {
    const res = await fetch(`${API_BASE}/products/${id}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Failed to restore product' }));
      throw new Error(data.error || 'Failed to restore product');
    }
    return res.json();
  },

  // Gas Brands (Admin & Storefront)
  async getBrands(includeDeleted: boolean = false): Promise<GasBrandItem[]> {
    const res = await fetch(`${API_BASE}/brands?includeDeleted=${includeDeleted}`);
    if (!res.ok) throw new Error('Failed to load gas brands');
    return res.json();
  },

  async createBrand(brand: Partial<GasBrandItem>): Promise<GasBrandItem> {
    const res = await fetch(`${API_BASE}/brands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(brand)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Failed to create brand' }));
      throw new Error(data.error || 'Failed to create brand');
    }
    return res.json();
  },

  async addBrand(brand: Partial<GasBrandItem>): Promise<GasBrandItem> {
    return this.createBrand(brand);
  },

  async updateBrand(id: string, updates: Partial<GasBrandItem>): Promise<GasBrandItem> {
    const res = await fetch(`${API_BASE}/brands/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Failed to update brand' }));
      throw new Error(data.error || 'Failed to update brand');
    }
    return res.json();
  },

  async deleteBrand(id: string, reason?: string): Promise<{ success: boolean; brand: GasBrandItem; message: string }> {
    const res = await fetch(`${API_BASE}/brands/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Failed to delete brand' }));
      throw new Error(data.error || 'Failed to delete brand');
    }
    return res.json();
  },

  async softDeleteBrand(id: string, reason?: string): Promise<{ success: boolean; brand: GasBrandItem; message: string }> {
    return this.deleteBrand(id, reason);
  },

  async restoreBrand(id: string): Promise<{ success: boolean; brand: GasBrandItem; message: string }> {
    const res = await fetch(`${API_BASE}/brands/${id}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Failed to restore brand' }));
      throw new Error(data.error || 'Failed to restore brand');
    }
    return res.json();
  },

  // Orders
  async getOrders(params?: { customerId?: string; status?: string; driverId?: string; scope?: string; includeArchived?: boolean }): Promise<Order[]> {
    const search = new URLSearchParams();
    if (params?.customerId) search.append('customerId', params.customerId);
    if (params?.status && params.status !== 'All') search.append('status', params.status);
    if (params?.driverId) search.append('driverId', params.driverId);
    if (params?.scope) search.append('scope', params.scope);
    if (params?.includeArchived) search.append('includeArchived', 'true');

    const res = await fetch(`${API_BASE}/orders?${search.toString()}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Failed to load orders: HTTP ${res.status}` }));
      throw new Error(err.error || `Failed to load orders: HTTP ${res.status}`);
    }
    return res.json();
  },

  async getOrderById(id: string): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Order not found' }));
      throw new Error(err.error || 'Order not found');
    }
    return res.json();
  },

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(orderData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create order' }));
      throw new Error(err.error || 'Failed to create order');
    }
    return res.json();
  },

  async updateOrder(orderId: string, data: Partial<Order>): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update order' }));
      throw new Error(err.error || 'Failed to update order');
    }
    return res.json();
  },

  async claimOrder(orderId: string, driverId?: string): Promise<{ order: Order; driver: Driver }> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/claim`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ driverId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to claim delivery' }));
      throw new Error(err.error || 'Failed to claim delivery');
    }
    return res.json();
  },

  async assignDriver(orderId: string, driverId: string): Promise<{ order: Order; driver: Driver }> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ driverId })
    });
    if (!res.ok) throw new Error('Failed to assign driver');
    return res.json();
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, proofOfDelivery?: any): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, proofOfDelivery })
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },

  async confirmPayment(orderId: string, paymentStatus: string = 'Paid'): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ paymentStatus })
    });
    if (!res.ok) throw new Error('Failed to update payment status');
    return res.json();
  },

  async updateCustomerLiveLocation(
    orderId: string,
    locationData: { lat: number; lng: number; accuracy?: number; isSharing: boolean }
  ): Promise<{ success: boolean; customerLiveLocation: any }> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/customer-location`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(locationData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update live location' }));
      throw new Error(err.error || 'Failed to update live location');
    }
    return res.json();
  },

  async reportDeliveryIssue(
    orderId: string,
    issueData: { issueType: string; notes?: string }
  ): Promise<{ success: boolean; message: string; order: Order }> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/report-issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(issueData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to report delivery issue' }));
      throw new Error(err.error || 'Failed to report delivery issue');
    }
    return res.json();
  },

  async restockProduct(productId: string, amount: number = 20): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${productId}/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ amount })
    });
    if (!res.ok) throw new Error('Failed to restock product');
    return res.json();
  },

  // Drivers
  async getDrivers(): Promise<Driver[]> {
    const res = await fetch(`${API_BASE}/drivers`, {
      headers: getAuthHeader()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Failed to load drivers: HTTP ${res.status}` }));
      throw new Error(err.error || `Failed to load drivers: HTTP ${res.status}`);
    }
    return res.json();
  },

  // Register new driver (Admin only)
  async registerDriver(driverData: {
    name: string;
    email: string;
    phone: string;
    vehicleType: string;
    licensePlate: string;
    capacity?: number;
    corridorZone?: string;
    assignedHub?: string;
    nationalId?: string;
    drivingLicenseNo?: string;
  }): Promise<{
    message: string;
    driver: Driver;
    activationUrl: string;
    emailStatus: { success: boolean; recipient: string; provider: string };
  }> {
    const res = await fetch(`${API_BASE}/admin/drivers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(driverData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create driver account' }));
      throw new Error(err.error || 'Failed to create driver account');
    }
    return res.json();
  },

  // Resend driver activation email (Admin only)
  async resendDriverActivation(driverId: string): Promise<{
    message: string;
    activationUrl: string;
    emailStatus: { success: boolean; recipient: string; provider: string };
  }> {
    const res = await fetch(`${API_BASE}/admin/drivers/${driverId}/resend-activation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to resend activation invitation' }));
      throw new Error(err.error || 'Failed to resend activation invitation');
    }
    return res.json();
  },

  // Verify driver activation token
  async verifyDriverActivationToken(token: string): Promise<{
    valid: boolean;
    driverName: string;
    email: string;
    driverId: string;
  }> {
    const res = await fetch(`${API_BASE}/auth/driver-activation/verify?token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Invalid or expired activation link' }));
      throw new Error(err.error || 'Invalid or expired activation link');
    }
    return res.json();
  },

  // Complete driver account activation
  async activateDriverAccount(data: {
    token: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; message: string; email: string }> {
    const res = await fetch(`${API_BASE}/auth/driver-activation/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Account activation failed' }));
      throw new Error(err.error || 'Account activation failed');
    }
    return res.json();
  },

  async updateDriverStatus(driverId: string, status: string, currentStop?: string): Promise<Driver> {
    const res = await fetch(`${API_BASE}/drivers/${driverId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, currentStop })
    });
    if (!res.ok) throw new Error('Failed to update driver status');
    return res.json();
  },

  async updateDriverLocation(driverId: string, location: { lat: number; lng: number; addressText: string; etaMinutes?: number }): Promise<any> {
    const res = await fetch(`${API_BASE}/drivers/${driverId}/location`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(location)
    });
    if (!res.ok) throw new Error('Failed to update driver location');
    return res.json();
  },

  async getDriverEarnings(driverId: string): Promise<DriverEarningsSummary> {
    const res = await fetch(`${API_BASE}/drivers/${driverId}/earnings`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to load driver earnings');
    return res.json();
  },

  async requestDriverCashout(driverId: string, amount?: number): Promise<{ success: boolean; transactionId: string; amount: number; remainingBalance: number; phone: string; message: string }> {
    const res = await fetch(`${API_BASE}/drivers/${driverId}/cashout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ amount })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Cashout failed' }));
      throw new Error(err.error || 'Cashout failed');
    }
    return res.json();
  },

  // Analytics
  async getAnalytics(): Promise<DashboardMetrics> {
    const res = await fetch(`${API_BASE}/analytics`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to load analytics');
    return res.json();
  },

  // Reset database to reference video seed
  async resetDatabase(): Promise<void> {
    const res = await fetch(`${API_BASE}/reset`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Database reset failed' }));
      throw new Error(err.error || 'Database reset failed');
    }
  },

  // Employees & Workforce
  async getEmployees(params?: { role?: string; status?: string; availability?: string; search?: string; includeArchived?: boolean }): Promise<Employee[]> {
    const searchParams = new URLSearchParams();
    if (params?.role && params.role !== 'All') searchParams.append('role', params.role);
    if (params?.status && params.status !== 'All') searchParams.append('status', params.status);
    if (params?.availability && params.availability !== 'All') searchParams.append('availability', params.availability);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.includeArchived) searchParams.append('includeArchived', 'true');

    const res = await fetch(`${API_BASE}/employees?${searchParams.toString()}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to load employees');
    return res.json();
  },

  async getEmployeeById(id: string): Promise<Employee> {
    const res = await fetch(`${API_BASE}/employees/${id}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to load employee details');
    return res.json();
  },

  async createEmployee(data: Partial<Employee>): Promise<Employee> {
    const res = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create employee' }));
      throw new Error(err.error || 'Failed to create employee');
    }
    return res.json();
  },

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
    const res = await fetch(`${API_BASE}/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update employee' }));
      throw new Error(err.error || 'Failed to update employee');
    }
    return res.json();
  },

  async updateEmployeeStatus(id: string, status: string, reason?: string): Promise<Employee> {
    const res = await fetch(`${API_BASE}/employees/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, reason })
    });
    if (!res.ok) throw new Error('Failed to update employee status');
    return res.json();
  },

  async terminateEmployee(id: string, reason: string): Promise<Employee> {
    const res = await fetch(`${API_BASE}/employees/${id}/terminate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) throw new Error('Failed to terminate employee');
    return res.json();
  },

  async assignVehicle(id: string, vehicle: string, licensePlate: string): Promise<Employee> {
    const res = await fetch(`${API_BASE}/employees/${id}/assign-vehicle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ vehicle, licensePlate })
    });
    if (!res.ok) throw new Error('Failed to assign vehicle');
    return res.json();
  },

  async deleteEmployee(id: string, reason?: string): Promise<{ message: string; softDeleted: boolean }> {
    const res = await fetch(`${API_BASE}/employees/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) throw new Error('Failed to delete employee');
    return res.json();
  },

  async bulkImportEmployees(employees: Partial<Employee>[]): Promise<{ imported: number; employees: Employee[] }> {
    const res = await fetch(`${API_BASE}/employees/bulk-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ employees })
    });
    if (!res.ok) throw new Error('Failed to import employees');
    return res.json();
  },

  async getWorkforceMetrics(): Promise<WorkforceMetrics> {
    const res = await fetch(`${API_BASE}/workforce-metrics`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to load workforce metrics');
    return res.json();
  },

  async getAlerts(): Promise<NeedsAttentionAlert[]> {
    const res = await fetch(`${API_BASE}/alerts`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to load operations alerts');
    return res.json();
  },

  async getActivity(): Promise<ActivityItem[]> {
    const res = await fetch(`${API_BASE}/activity`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to load activity logs');
    return res.json();
  },

  // Archive & Soft-Delete Operations
  async archiveOrder(id: string, reason?: string): Promise<{ message: string; order: Order }> {
    const res = await fetch(`${API_BASE}/orders/${id}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to archive order' }));
      throw new Error(err.error || 'Failed to archive order');
    }
    return res.json();
  },

  async restoreOrder(id: string): Promise<{ message: string; order: Order }> {
    const res = await fetch(`${API_BASE}/orders/${id}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to restore order' }));
      throw new Error(err.error || 'Failed to restore order');
    }
    return res.json();
  },

  async deleteOrder(id: string, reason?: string): Promise<{ message: string; softDeleted: boolean; order: Order }> {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete order' }));
      throw new Error(err.error || 'Failed to delete order');
    }
    return res.json();
  },

  async archiveEmployee(id: string, reason?: string): Promise<{ message: string; employee: Employee }> {
    const res = await fetch(`${API_BASE}/employees/${id}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to archive employee' }));
      throw new Error(err.error || 'Failed to archive employee');
    }
    return res.json();
  },

  async restoreEmployee(id: string): Promise<{ message: string; employee: Employee }> {
    const res = await fetch(`${API_BASE}/employees/${id}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to restore employee' }));
      throw new Error(err.error || 'Failed to restore employee');
    }
    return res.json();
  },

  // Archive Manager
  async getArchive(): Promise<ArchiveResponse> {
    const res = await fetch(`${API_BASE}/archive`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to load archive data');
    return res.json();
  },

  async restoreArchiveItem(type: 'employee' | 'order', id: string): Promise<{ message: string; record: any; stats: ArchiveStats }> {
    const res = await fetch(`${API_BASE}/archive/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ type, id })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to restore archived item' }));
      throw new Error(err.error || 'Failed to restore archived item');
    }
    return res.json();
  },

  async restoreArchiveBatch(items: Array<{ type: 'employee' | 'order'; id: string }>): Promise<{ message: string; restored: any[]; stats: ArchiveStats }> {
    const res = await fetch(`${API_BASE}/archive/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ items })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to restore batch' }));
      throw new Error(err.error || 'Failed to restore batch');
    }
    return res.json();
  },

  async permanentlyDeleteArchiveItem(type: 'employee' | 'order', id: string): Promise<{ message: string; stats: ArchiveStats }> {
    const res = await fetch(`${API_BASE}/archive/permanent/${type}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to permanently delete item' }));
      throw new Error(err.error || 'Failed to permanently delete item');
    }
    return res.json();
  },

  // Integrations Management
  async getIntegrations(): Promise<{ integrations: IntegrationItem[]; overview: IntegrationsOverview }> {
    const res = await fetch(`${API_BASE}/integrations`, {
      headers: getAuthHeader()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to load integrations' }));
      throw new Error(err.error || 'Failed to load integrations');
    }
    return res.json();
  },

  async getIntegration(id: string): Promise<IntegrationItem> {
    const res = await fetch(`${API_BASE}/integrations/${id}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to load integration' }));
      throw new Error(err.error || 'Failed to load integration');
    }
    return res.json();
  },

  async updateIntegration(
    id: string,
    data: {
      config?: Record<string, string>;
      environment?: string;
      authMethod?: string;
      isEnabled?: boolean;
    }
  ): Promise<{ message: string; integration: IntegrationItem; overview: IntegrationsOverview }> {
    const res = await fetch(`${API_BASE}/integrations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update integration' }));
      throw new Error(err.error || 'Failed to update integration');
    }
    return res.json();
  },

  async testIntegration(
    id: string
  ): Promise<{ success: boolean; message: string; responseTimeMs: number; details?: any; integration: IntegrationItem }> {
    const res = await fetch(`${API_BASE}/integrations/${id}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Connection test failed' }));
      throw new Error(err.error || 'Connection test failed');
    }
    return res.json();
  },

  async toggleIntegration(
    id: string,
    isEnabled: boolean
  ): Promise<{ message: string; integration: IntegrationItem; overview: IntegrationsOverview }> {
    const res = await fetch(`${API_BASE}/integrations/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ isEnabled })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to toggle integration' }));
      throw new Error(err.error || 'Failed to toggle integration');
    }
    return res.json();
  },

  async getIntegrationLogs(limit = 50): Promise<IntegrationLog[]> {
    const res = await fetch(`${API_BASE}/integrations/logs?limit=${limit}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to load integration logs' }));
      throw new Error(err.error || 'Failed to load integration logs');
    }
    return res.json();
  },

  // Customer Management (Admin Portal)
  async getCustomers(): Promise<CustomerRecord[]> {
    const res = await fetch(`${API_BASE}/admin/customers`, {
      headers: getAuthHeader()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to load customers' }));
      throw new Error(err.error || 'Failed to load customers');
    }
    return res.json();
  },

  async getCustomerDetails(id: string): Promise<{ customer: CustomerRecord; orders: Order[] }> {
    const res = await fetch(`${API_BASE}/admin/customers/${id}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to load customer details' }));
      throw new Error(err.error || 'Failed to load customer details');
    }
    return res.json();
  },

  async suspendCustomer(id: string, reason?: string): Promise<{ message: string; customer: CustomerRecord }> {
    const res = await fetch(`${API_BASE}/admin/customers/${id}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to suspend customer' }));
      throw new Error(err.error || 'Failed to suspend customer');
    }
    return res.json();
  },

  async reactivateCustomer(id: string): Promise<{ message: string; customer: CustomerRecord }> {
    const res = await fetch(`${API_BASE}/admin/customers/${id}/reactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to reactivate customer' }));
      throw new Error(err.error || 'Failed to reactivate customer');
    }
    return res.json();
  },

  async updateCustomerStatus(id: string, status: string, reason?: string): Promise<{ message: string; customer: CustomerRecord }> {
    const res = await fetch(`${API_BASE}/admin/customers/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, reason })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update customer status' }));
      throw new Error(err.error || 'Failed to update customer status');
    }
    return res.json();
  }
};
