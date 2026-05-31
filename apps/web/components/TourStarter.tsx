'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getTour } from '@/lib/tours';

export function TourStarter() {
  const params = useSearchParams();
  const tourId = params.get('tour');

  useEffect(() => {
    if (!tourId) return;

    const tour = getTour(tourId);
    if (!tour) return;

    // Small delay so the page finishes rendering
    const timer = setTimeout(async () => {
      // Clean up URL here — after the timer fires it's too late to cancel it
      const url = new URL(window.location.href);
      url.searchParams.delete('tour');
      window.history.replaceState({}, '', url.toString());

      const introJs = (await import('intro.js')).default;

      const instance = introJs();
      instance.setOptions({
        steps: tour.steps.map(s => ({
          element:  s.element ?? undefined,
          title:    s.title,
          intro:    s.intro,
          position: (s.position === 'auto' ? undefined : s.position),
        })),
        showProgress:      true,
        showBullets:       false,
        exitOnOverlayClick: true,
        nextLabel:         'Siguiente →',
        prevLabel:         '← Anterior',
        doneLabel:         'Finalizar',
        disableInteraction: false,
        scrollToElement:   true,
        overlayOpacity:    0.4,
        tooltipClass:      'fundares-intro-tooltip',
        highlightClass:    'fundares-intro-highlight',
      });

      instance.start();
    }, 600);

    return () => clearTimeout(timer);
  }, [tourId]);

  return null;
}
