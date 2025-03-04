import { Badge } from "@/components/ui/badge";
import { Dispatch, SetStateAction } from 'react';

interface IOption {
  value: string;
  disabled?: boolean;
}

interface BadgeSelectorProps {
  options: IOption[];
  selected: string;
  setSelected: Dispatch<SetStateAction<string>>;
  className?: string; // Add this line to allow passing a custom className
}
const BadgeSelector: React.FC<BadgeSelectorProps> = ({ options, selected, setSelected, className }) => {
  return (
    <div className={`inline-flex space-x-2 p-1 bg-gray-100/50 rounded-full ${className || ''}`}>
      {options.map((option) => {
        let cn = "cursor-pointer rounded-xl text-black";
        if (selected === option.value) cn += ' bg-white-angel hover:bg-orange-verm hover:text-white-angel';
        else if (option.disabled) cn += ' bg-transparent cursor-not-allowed text-gray-500'
        else cn += ' bg-transparent hover:bg-gray-200';
        return (
          <Badge
            key={option.value}
            variant="secondary"
            className={cn}
            onClick={() => { if (!option.disabled) setSelected(option.value) }}
          >
            {option.value}
          </Badge>
        )
      })}
    </div>
  );
};

export default BadgeSelector;
