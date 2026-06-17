import LandingProduct  from "./LandingProduct";
import LandingSocial   from "./LandingSocial";
import LandingCompany  from "./LandingCompany";
import LandingPricing  from "./LandingPricing";

interface LandingSectionsProps {
  onEnter: () => void;
  onContact: () => void;
}

export default function LandingSections({ onEnter, onContact }: LandingSectionsProps) {
  return (
    <>
      <LandingProduct  onEnter={onEnter} />
      <LandingSocial   onContact={onContact} />
      <LandingCompany  onContact={onContact} />
      <LandingPricing  onContact={onContact} />
    </>
  );
}
