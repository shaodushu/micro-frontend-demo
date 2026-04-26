import { useSearchParams } from 'umi';

const mockDetail: Record<string, { title: string; description: string; status: string; createdAt: string }> = {
  '1': { title: '任务一', description: '这是任务一的详细描述，包含具体的需求说明和验收标准。', status: '进行中', createdAt: '2026-04-20' },
  '2': { title: '任务二', description: '这是任务二的详细描述，该任务已完成开发并上线。', status: '已完成', createdAt: '2026-04-18' },
  '3': { title: '任务三', description: '这是任务三的详细描述，等待资源分配后开始。', status: '待开始', createdAt: '2026-04-22' },
};

export default function DetailPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || '1';
  const detail = mockDetail[id];

  if (!detail) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
        <h2>未找到该任务</h2>
        <p>ID: {id}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 8 }}>{detail.title}</h2>
      <div style={{ marginBottom: 24, fontSize: 12, color: '#999' }}>
        创建时间: {detail.createdAt}
        <span style={{
          display: 'inline-block',
          marginLeft: 12,
          padding: '1px 6px',
          borderRadius: 3,
          fontSize: 12,
          background: detail.status === '已完成' ? '#f6ffed' : detail.status === '进行中' ? '#e6f7ff' : '#fff7e6',
          color: detail.status === '已完成' ? '#52c41a' : detail.status === '进行中' ? '#1890ff' : '#faad14',
        }}>
          {detail.status}
        </span>
      </div>
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 4,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        lineHeight: 1.8,
        color: '#333',
      }}>
        {detail.description}
      </div>
    </div>
  );
}
