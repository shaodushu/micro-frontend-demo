import { useState } from 'react';

const mockData = [
  { id: 1, title: '任务一', status: '进行中', assignee: '张三' },
  { id: 2, title: '任务二', status: '已完成', assignee: '李四' },
  { id: 3, title: '任务三', status: '待开始', assignee: '王五' },
  { id: 4, title: '任务四', status: '进行中', assignee: '赵六' },
];

export default function ListPage() {
  const [data] = useState(mockData);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 20 }}>数据列表</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ background: '#fafafa', borderBottom: '2px solid #e8e8e8' }}>
            <th style={{ padding: '12px 16px', textAlign: 'left' }}>ID</th>
            <th style={{ padding: '12px 16px', textAlign: 'left' }}>标题</th>
            <th style={{ padding: '12px 16px', textAlign: 'left' }}>状态</th>
            <th style={{ padding: '12px 16px', textAlign: 'left' }}>负责人</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '12px 16px' }}>{item.id}</td>
              <td style={{ padding: '12px 16px' }}>{item.title}</td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 3,
                  fontSize: 12,
                  background: item.status === '已完成' ? '#f6ffed' : item.status === '进行中' ? '#e6f7ff' : '#fff7e6',
                  color: item.status === '已完成' ? '#52c41a' : item.status === '进行中' ? '#1890ff' : '#faad14',
                  border: `1px solid ${item.status === '已完成' ? '#b7eb8f' : item.status === '进行中' ? '#91d5ff' : '#ffd591'}`,
                }}>
                  {item.status}
                </span>
              </td>
              <td style={{ padding: '12px 16px' }}>{item.assignee}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
