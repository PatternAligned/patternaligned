export default function PALogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="30" height="30" stroke="white" strokeWidth="1.5"/>
      <path d="M8 24L16 8L24 24" stroke="white" strokeWidth="1.5" strokeLinecap="square"/>
      <path d="M11 19H21" stroke="white" strokeWidth="1.5" strokeLinecap="square"/>
    </svg>
  );
}
