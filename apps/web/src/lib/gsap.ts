import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase);

// The design system's motion curves, by name, for GSAP tweens.
CustomEase.create("brandOut", "0.22,1,0.36,1");
CustomEase.create("brandOvershoot", "0.2,0.9,0.3,1.2");

export { gsap, ScrollTrigger, useGSAP };
