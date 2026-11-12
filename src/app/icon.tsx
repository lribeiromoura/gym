import { ImageResponse } from 'next/og';

export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 240,
          background: 'linear-gradient(135deg, #1D8FE1 0%, #0F172A 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 900,
          borderRadius: 112,
        }}
      >
        IP
      </div>
    ),
    {
      ...size,
    }
  );
}
