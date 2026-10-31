/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { formatINR } from '../../utils/finance.ts';

interface AnimatedCounterProps {
  paise: number;
  compact?: boolean;
  className?: string;
  durationMs?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  paise,
  compact = false,
  className = '',
  durationMs = 900
}) => {
  const [displayPaise, setDisplayPaise] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const startVal = displayPaise;
    const targetVal = paise;
    const diff = targetVal - startVal;

    let animId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPaise(Math.round(startVal + diff * eased));

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      }
    };

    animId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animId);
  }, [paise, durationMs]);

  return (
    <span className={`tabular-nums font-mono ${className}`}>
      {formatINR(displayPaise, { compact })}
    </span>
  );
};
