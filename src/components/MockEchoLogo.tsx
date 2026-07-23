/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MockEcho Visual Identity Components
 * Minimal, modern, high-craft editorial design representing speech, reflection, confidence, and coaching.
 */

import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  size?: number;
  className?: string;
  animate?: boolean;
  colorClass?: string; // e.g., 'text-accent-forest'
  coreColorClass?: string; // e.g., 'text-accent-clay'
}

/**
 * MockEcho Standing Resonance Icon
 * Represents communication/echo (interlocking sound reflections) and confidence (central stable pillar).
 */
export const MockEchoLogo: React.FC<LogoProps> = ({
  size = 32,
  className = '',
  animate = true,
  colorClass = 'text-accent-forest',
  coreColorClass = 'text-accent-clay',
}) => {
  const containerVariants = {
    animate: {
      scale: [0.99, 1.01, 0.99],
      transition: {
        repeat: Infinity,
        duration: 5,
        ease: 'easeInOut',
      },
    },
  };

  const leftBladeVariants = {
    animate: {
      y: [0, -0.6, 0],
      transition: {
        repeat: Infinity,
        duration: 4,
        ease: 'easeInOut',
      },
    },
  };

  const rightBladeVariants = {
    animate: {
      y: [0, 0.6, 0],
      transition: {
        repeat: Infinity,
        duration: 4,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      variants={animate ? containerVariants : undefined}
      animate={animate ? "animate" : undefined}
      id="mock-echo-logo-svg"
    >
      {/* Left Monogram Column (M - Voice Input) */}
      <motion.path
        d="M 10,12 H 17 L 23,18 V 25 L 17,19 V 36 H 10 Z"
        className={`fill-current ${colorClass}`}
        variants={animate ? leftBladeVariants : undefined}
        id="logo-left-half"
      />

      {/* Right Monogram Column (E - Reflection Echo, shifted/shifted down) */}
      <motion.path
        d="M 38,16 H 31 L 25,22 V 29 L 31,23 V 40 H 38 Z"
        className={`fill-current ${coreColorClass}`}
        variants={animate ? rightBladeVariants : undefined}
        id="logo-right-half"
      />
    </motion.svg>
  );
};

interface WordmarkProps {
  className?: string;
  sizeClass?: string; // e.g. 'text-xl'
  darkContext?: boolean;
}

/**
 * MockEcho Typography Wordmark
 * Dual pairing: "Mock" in solid, confident structured sans-serif, "Echo" in organic, flowing serif italic.
 */
export const MockEchoWordmark: React.FC<WordmarkProps> = ({
  className = '',
  sizeClass = 'text-xl',
  darkContext = false,
}) => {
  return (
    <span
      className={`font-sans tracking-tight leading-none ${sizeClass} ${className} select-none`}
      id="mock-echo-wordmark"
    >
      <span
        className={`font-semibold ${
          darkContext ? 'text-white' : 'text-text-charcoal'
        }`}
      >
        Mock
      </span>
      <span className="font-serif-editorial italic font-extrabold text-accent-forest ml-0.5">
        Echo
      </span>
    </span>
  );
};

interface CombinedProps extends LogoProps {
  vertical?: boolean;
  spacingClass?: string; // e.g., 'space-x-3' or 'space-y-2'
  wordmarkSizeClass?: string;
  darkContext?: boolean;
}

/**
 * MockEcho Complete Logo & Wordmark lockup
 */
export const MockEchoLogoWithWordmark: React.FC<CombinedProps> = ({
  vertical = false,
  spacingClass = '',
  size = 28,
  animate = true,
  colorClass = 'text-accent-forest',
  coreColorClass = 'text-accent-clay',
  wordmarkSizeClass = 'text-lg',
  darkContext = false,
  className = '',
}) => {
  const containerClass = vertical
    ? `flex flex-col items-center ${spacingClass || 'space-y-2.5'}`
    : `flex items-center ${spacingClass || 'space-x-3'}`;

  return (
    <div className={`${containerClass} ${className}`} id="mock-echo-brand-lockup">
      <MockEchoLogo
        size={size}
        animate={animate}
        colorClass={colorClass}
        coreColorClass={coreColorClass}
      />
      <MockEchoWordmark
        sizeClass={wordmarkSizeClass}
        darkContext={darkContext}
      />
    </div>
  );
};
