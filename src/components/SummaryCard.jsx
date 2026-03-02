import React from 'react';
import HelpIcon from './HelpIcon';
import RichTooltip from './RichTooltip';

const accentColors = {
  sunset: 'bg-sunset-500',
  lake: 'bg-lake-500',
  forest: 'bg-green-500',
  danger: 'bg-red-500',
};

export default function SummaryCard({ label, value, subtitle, color = 'sunset', help, richHelp }) {
  const accent = accentColors[color] || accentColors.sunset;

  return (
    <div className="card-base flex flex-col h-full">
      <div className={`h-1 ${accent} rounded-t-xl`} />
      <div className="px-4 py-3 flex flex-col flex-1">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide flex items-center gap-0.5 whitespace-nowrap">
          {label}
          {richHelp ? <RichTooltip {...richHelp} /> : help && <HelpIcon text={help} />}
        </p>
        <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums leading-tight">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
