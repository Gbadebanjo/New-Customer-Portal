import React from 'react';
import ClipLoader from 'react-spinners/ClipLoader';

const FullScreenLoader = () => (
  <div style={{
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  }}>
    <ClipLoader color="#FF7D70" size={80} />
  </div>
);

export default FullScreenLoader;