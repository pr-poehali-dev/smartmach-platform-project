import { useNavigate } from "react-router-dom";
import { FONT } from "./landing.data";
import LandingHero from "./LandingHero";
import LandingSections from "./LandingSections";
import LandingContact from "./LandingContact";
import SeoHead from "@/components/ui/seo-head";
import { PAGE_SEO } from "@/lib/seo.data";

export default function Landing() {
  const navigate = useNavigate();
  const onEnter = () => navigate("/platform");

  return (
    <div className="min-h-screen bg-white text-foreground overflow-x-hidden" style={FONT}>
      <SeoHead {...PAGE_SEO.landing} />
      <LandingHero onEnter={onEnter} />
      <LandingSections onEnter={onEnter} onContact={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} />
      <LandingContact onEnter={onEnter} />
    </div>
  );
}