import { Navigate, RouteObject, useRoutes } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { LoginPage } from '@/modules/system/pages/LoginPage';
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage';
import { VehicleListPage } from '@/modules/vehicles/pages/VehicleListPage';
import { VehicleDetailPage } from '@/modules/vehicles/pages/VehicleDetailPage';
import { CustomerListPage } from '@/modules/customers/pages/CustomerListPage';
import { CustomerDetailPage } from '@/modules/customers/pages/CustomerDetailPage';
import { DebtListPage } from '@/modules/debts/pages/DebtListPage';
import EmployeesPage from '@/pages/Employees';
import { EmployeeDetailPage } from '@/modules/employees/pages/EmployeeDetailPage';
import TransactionsPage from '@/pages/Transactions';
import ReportsPage from '@/pages/Reports';
import TripListPage from '@/modules/trips/pages/TripListPage';
import TripDetailPage from '@/modules/trips/pages/TripDetailPage';
import TripCreatePage from '@/modules/trips/pages/TripCreatePage';
import TripEditPage from '@/modules/trips/pages/TripEditPage';
import { ROUTES } from '@/config/routes';


export function AppRoutes() {
  const routes: RouteObject[] = [
    {
      path: ROUTES.LOGIN,
      element: <LoginPage />,
    },
    {
      path: '/',
      element: <MainLayout />,
      children: [
        {
          index: true,
          element: (
            <PermissionGuard allowedRoles={['ADMIN', 'DISPATCHER', 'ACCOUNTANT', 'DRIVER']}>
              <DashboardPage />
            </PermissionGuard>
          ),
        },
        {
          path: ROUTES.VEHICLES,
          element: (
            <PermissionGuard allowedRoles={['ADMIN', 'DISPATCHER']}>
              <VehicleListPage />
            </PermissionGuard>
          ),
        },
        {
          path: `${ROUTES.VEHICLES}/:id`,
          element: (
            <PermissionGuard allowedRoles={['ADMIN', 'DISPATCHER']}>
              <VehicleDetailPage />
            </PermissionGuard>
          ),
        },
        {
          path: ROUTES.EMPLOYEES,
          element: (
            <PermissionGuard allowedRoles={['ADMIN']}>
              <EmployeesPage />
            </PermissionGuard>
          ),
        },
        {
          path: `${ROUTES.EMPLOYEES}/:id`,
          element: (
            <PermissionGuard allowedRoles={['ADMIN']}>
              <EmployeeDetailPage />
            </PermissionGuard>
          ),
        },
        {
          path: ROUTES.CUSTOMERS,
          element: (
            <PermissionGuard allowedRoles={['ADMIN', 'ACCOUNTANT', 'DISPATCHER']}>
              <CustomerListPage />
            </PermissionGuard>
          ),
        },
        {
          path: `${ROUTES.CUSTOMERS}/:id`,
          element: (
            <PermissionGuard allowedRoles={['ADMIN', 'ACCOUNTANT', 'DISPATCHER']}>
              <CustomerDetailPage />
            </PermissionGuard>
          ),
        },
        {
          path: ROUTES.TRIPS,
          element: (
            <PermissionGuard allowedRoles={['ADMIN', 'DISPATCHER']}>
              <TripListPage />
            </PermissionGuard>
          ),
        },
        {
          path: `${ROUTES.TRIPS}/create`,
          element: (
            <PermissionGuard allowedRoles={['ADMIN', 'DISPATCHER']}>
              <TripCreatePage />
            </PermissionGuard>
          ),
        },
        {
          path: `${ROUTES.TRIPS}/:id/edit`,
          element: (
            <PermissionGuard allowedRoles={['ADMIN', 'DISPATCHER']}>
              <TripEditPage />
            </PermissionGuard>
          ),
        },
        {
          path: `${ROUTES.TRIPS}/:id`,
          element: (
            <PermissionGuard allowedRoles={['ADMIN', 'DISPATCHER']}>
              <TripDetailPage />
            </PermissionGuard>
          ),
        },
        {
          path: ROUTES.DEBTS,
          element: (
            <PermissionGuard allowedRoles={['ADMIN', 'ACCOUNTANT', 'DISPATCHER']}>
              <DebtListPage />
            </PermissionGuard>
          ),
        },
        {
          path: ROUTES.TRANSACTIONS,
          element: (
            <PermissionGuard allowedRoles={['ADMIN', 'ACCOUNTANT']}>
              <TransactionsPage />
            </PermissionGuard>
          ),
        },
        {
          path: ROUTES.REPORTS,
          element: (
            <PermissionGuard allowedRoles={['ADMIN', 'ACCOUNTANT']}>
              <ReportsPage />
            </PermissionGuard>
          ),
        },
      ],
    },
    {
      path: '*',
      element: <Navigate to={ROUTES.ROOT} replace />,
    },
  ];

  return useRoutes(routes);
}

