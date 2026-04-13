import { useNavigate } from "react-router-dom";
import { FONT } from "./landing.data";
import LandingHero from "./LandingHero";
import LandingSections from "./LandingSections";
import LandingContact from "./LandingContact";

export default function Landing() {
  const navigate = useNavigate();
  const onEnter = () => navigate("/platform");

  return (
    <div className="min-h-screen bg-white text-foreground overflow-x-hidden" style={FONT}>
      <LandingHero onEnter={onEnter} />
      <LandingSections onEnter={onEnter} />
      <LandingContact onEnter={onEnter} />
    </div>
  );
}
