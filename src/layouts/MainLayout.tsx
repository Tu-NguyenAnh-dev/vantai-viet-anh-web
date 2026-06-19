import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ProLayout } from '@ant-design/pro-components';
import {
  DashboardOutlined,
  CarOutlined,
  UserOutlined,
  TeamOutlined,
  SwapOutlined,
  DollarOutlined,
  AccountBookOutlined,
  BarChartOutlined,
  LogoutOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { MENU_ROUTES } from '@/config/routes';
import { useAuthContext } from '@/context/AuthContext';

const ICON_MAP: Record<string, React.ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  CarOutlined: <CarOutlined />,
  UserOutlined: <UserOutlined />,
  TeamOutlined: <TeamOutlined />,
  SwapOutlined: <SwapOutlined />,
  DollarOutlined: <DollarOutlined />,
  AccountBookOutlined: <AccountBookOutlined />,
  BarChartOutlined: <BarChartOutlined />,
  UploadOutlined: <UploadOutlined />,
};

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthContext();
  const [pathname, setPathname] = useState(location.pathname);

  const menuItems = MENU_ROUTES.map((r) => ({
    path: r.path,
    name: r.name,
    icon: ICON_MAP[r.icon] ?? <DashboardOutlined />,
  }));

  const userMenuItems: MenuProps['items'] = [
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: logout },
  ];

  return (
    <ProLayout
      title="Vận Tải Anh Việt"
      logo={null}
      layout="mix"
      splitMenus={false}
      location={{ pathname }}
      menu={{ request: async () => menuItems }}
      menuItemRender={(item, dom) => (
        <a
          onClick={() => {
            setPathname(item.path || '/');
            navigate(item.path || '/');
          }}
        >
          {dom}
        </a>
      )}
      avatarProps={{
        src: undefined,
        title: user?.fullName ?? 'Admin',
        size: 'small',
        render: (_, dom) => (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            {dom}
          </Dropdown>
        ),
      }}
      headerContentRender={() => null}
    >
      <div style={{ padding: 24, minHeight: 'calc(100vh - 120px)' }}>
        <Outlet />
      </div>
    </ProLayout>
  );
}
