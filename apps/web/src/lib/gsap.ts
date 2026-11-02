import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { Observer } from "gsap/Observer";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase, Observer);

// The design system's motion curves, by name, for GSAP tweens.
CustomEase.create("brandOut", "0.22,1,0.36,1");
CustomEase.create("brandOvershoot", "0.2,0.9,0.3,1.2");

// Import GSAP from here, so the plugins and curves above are registered first.
export { useGSAP } from "@gsap/react";
export { default as gsap } from "gsap";
export { Observer } from "gsap/Observer";
