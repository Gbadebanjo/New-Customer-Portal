'use client';
import { PulseLoader } from "react-spinners";

export default function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#0D202F',
    }}>
      <PulseLoader color="#3498db" size={15} />
    </div>
  );
}
