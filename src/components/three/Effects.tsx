"use client";

// High tier only: a soft mipmap bloom so the neon actually glows.
import { Bloom, EffectComposer } from "@react-three/postprocessing";

export default function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={1.05} luminanceThreshold={0.55} luminanceSmoothing={0.25} radius={0.7} />
    </EffectComposer>
  );
}
