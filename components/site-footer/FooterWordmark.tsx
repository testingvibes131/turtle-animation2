export function FooterWordmark() {
  return (
    <div className="footer-wordmark-wrap" style={{ marginTop: "clamp(24px, 4vw, 64px)" }}>
      <img
        src="/footer/turtle-xyz-stroke.svg"
        alt="turtle.xyz"
        className="footer-wordmark-svg"
        draggable={false}
      />
    </div>
  );
}
