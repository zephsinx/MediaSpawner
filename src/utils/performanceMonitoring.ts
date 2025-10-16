import { onCLS, onFCP, onLCP, onTTFB, onINP } from "web-vitals";

interface WebVitalsMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
}

export function initPerformanceMonitoring() {
  if (import.meta.env.DEV) {
    const logMetric = (metric: WebVitalsMetric) => {
      console.log(
        `%c${metric.name}`,
        `color: ${getColorForRating(metric.rating)}; font-weight: bold`,
        `${metric.value.toFixed(2)}ms`,
        `(${metric.rating})`,
      );
    };

    onCLS(logMetric);
    onFCP(logMetric);
    onLCP(logMetric);
    onTTFB(logMetric);
    onINP(logMetric);
  }
}

function getColorForRating(rating: string): string {
  switch (rating) {
    case "good":
      return "#0CCE6B";
    case "needs-improvement":
      return "#FFA400";
    case "poor":
      return "#FF4E42";
    default:
      return "#000000";
  }
}
