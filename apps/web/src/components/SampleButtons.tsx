import { Button } from "./Button";
import type { SampleFile } from "../lib/api";

interface SampleButtonsProps {
  samples: SampleFile[];
  onSelect: (id: string) => void;
  isLoading: boolean;
}

export function SampleButtons({ samples, onSelect, isLoading }: SampleButtonsProps) {
  if (samples.length === 0) return null;

  return (
    <div className="pt-4 border-t border-(--border)">
      <p className="text-base font-medium mb-3 text-(--text-primary)">Or try with sample data:</p>
      <div className="flex flex-wrap gap-3">
        {samples.map((sample) => (
          <Button
            key={sample.id}
            variant="secondary"
            size="sm"
            onClick={() => onSelect(sample.id)}
            disabled={isLoading}
          >
            {sample.title}
          </Button>
        ))}
      </div>
    </div>
  );
}
