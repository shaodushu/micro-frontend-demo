import { MicroApp } from 'umi';
import { getToken, getUserInfo } from '@/utils/auth';

export default function SlavePage() {
  const token = getToken();
  const userInfo = getUserInfo();

  return (
    <div style={{ padding: 0 }}>
      <MicroApp name="slave-app" token={token} userInfo={userInfo} />
    </div>
  );
}
