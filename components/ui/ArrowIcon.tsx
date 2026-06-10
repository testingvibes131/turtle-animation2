type ArrowIconProps = {
  className?: string;
};

export function ArrowIcon({ className }: ArrowIconProps) {
  return (
    <svg
      width="6"
      height="10"
      viewBox="0 0 6 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M1 1L5 5L1 9"
        stroke="var(--brand-primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
