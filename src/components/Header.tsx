import { FileTextOutlined } from '@ant-design/icons';
import { Layout, Typography } from 'antd';
import { APP_VERSION } from '../utils/constants';

const { Header } = Layout;
const { Title } = Typography;

export default function AppHeader() {
  return (
    <Header
      style={{
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        height: 56,
      }}
    >
      <FileTextOutlined style={{ fontSize: 22, color: '#1677ff', marginRight: 10 }} />
      <Title level={4} style={{ margin: 0, color: '#1f1f1f', fontWeight: 600 }}>
        LetsDoc 文书模板生成器
      </Title>
      <span style={{ marginLeft: 12, color: '#999', fontSize: 12 }}>{APP_VERSION}</span>
    </Header>
  );
}
