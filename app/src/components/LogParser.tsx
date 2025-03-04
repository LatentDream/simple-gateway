import { LogsResponse } from "@/types/logs";
import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "./ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Checkbox } from "./ui/checkbox";
import WithLoadingContainer from "./WithLoadingContainer";


export interface ParsedLog {
  timestamp: Date | null;
  level: string;
  message: string;
  raw: string;
  parsed: boolean;
}

const KNOWN_LEVELS = [
  'ERROR', 'WARN', 'WARNING', 'INFO', 'DEBUG', 'TRACE', 'FATAL',
  'NOTICE', 'CRITICAL', 'SEVERE', 'VERBOSE'
];

// Helper to create a regex pattern that matches known levels
const createLevelPattern = () => {
  const levels = Array.from(KNOWN_LEVELS).join('|');
  return `(?:${levels})`;
};

const LOG_PATTERNS = [
  // DASH: Format: ISO_TIMESTAMP - [timestamp] [pid] [level] message
  {
    regex: new RegExp(`^\\d{4}-\\d{2}-\\d{2}T[\\d:.]+\\+\\d{2}:\\d{2}\\s+-\\s+\\[(\\d{4}-\\d{2}-\\d{2}\\s+\\d{2}:\\d{2}:\\d{2}\\s+[+-]\\d{4})\\]\\s+\\[(\\d+)\\]\\s+\\[(${createLevelPattern()})\\]\\s+(.+)$`),
    map: (match: RegExpMatchArray): ParsedLog => ({
      timestamp: new Date(match[1]),
      level: match[3],
      message: match[4],
      raw: match[0],
      parsed: true
    })
  },
  // ISO timestamp with level and message
  {
    regex: new RegExp(`^(\\d{4}-\\d{2}-\\d{2}T[\\d:.]+(?:Z|[+-]\\d{2}:?\\d{2})) - (${createLevelPattern()})(.+)$`),
    map: (match: RegExpMatchArray): ParsedLog => ({
      timestamp: new Date(match[1]),
      level: match[2],
      message: match[3],
      raw: match[0],
      parsed: true
    })
  },
  // ISO timestamp with message only (defaulting to INFO)
  {
    regex: /^(\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})) - (.+)$/,
    map: (match: RegExpMatchArray): ParsedLog => ({
      timestamp: new Date(match[1]),
      level: 'INFO',
      message: match[2],
      raw: match[0],
      parsed: true
    })
  },
  // Common timestamp format with level
  {
    regex: new RegExp(`^(\\d{4}-\\d{2}-\\d{2}\\s+\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?)\\s+(${createLevelPattern()})\\s+(.+)$`),
    map: (match: RegExpMatchArray): ParsedLog => ({
      timestamp: new Date(match[1]),
      level: match[2],
      message: match[3],
      raw: match[0],
      parsed: true
    })
  },
  // Level prefix without timestamp
  {
    regex: new RegExp(`^(?:\\[?(${createLevelPattern()})\\]?:?\\s+)(.+)$`),
    map: (match: RegExpMatchArray): ParsedLog => ({
      timestamp: null,
      level: match[1],
      message: match[2],
      raw: match[0],
      parsed: true
    })
  },
  // ISO 8601 with microsecond precision
  {
    regex: new RegExp(`^(\\d{4}-\\d{2}-\\d{2}T[\\d:.]+) - (${createLevelPattern()})(.+)$`),
    map: (match: RegExpMatchArray): ParsedLog => ({
      timestamp: new Date(match[1]),
      level: match[2],
      message: match[3],
      raw: match[0],
      parsed: true
    })
  },
  // Microsecond precision with file location
  {
    regex: new RegExp(`^(\\d{4}-\\d{2}-\\d{2}T[\\d:.]+)\\s+-\\s+(${createLevelPattern()}):\\s+(.+?)(?:\\s+\\([^)]+\\))?$`),
    map: (match: RegExpMatchArray): ParsedLog => ({
      timestamp: new Date(match[1]),
      level: match[2],
      message: match[3],
      raw: match[0],
      parsed: true
    })
  },
];

const normalizeLogLevel = (level: string): string => {
  const upperLevel = level.toUpperCase();
  if (new Set(KNOWN_LEVELS).has(upperLevel)) {
    return upperLevel;
  }
  // Try to detect log level from the message content
  if (upperLevel.includes('ERR')) return 'ERROR';
  if (upperLevel.includes('WARN')) return 'WARNING';
  if (upperLevel.includes('DBG')) return 'DEBUG';
  if (upperLevel.includes('INF')) return 'INFO';
  return `UNKNOWN ${level}`;
};

const parseLogLine = (line: string): ParsedLog => {
  // Skip empty lines
  if (!line.trim()) {
    return {
      timestamp: null,
      level: 'INFO',
      message: '',
      raw: line,
      parsed: false
    };
  }

  // Try each pattern until one matches
  for (const pattern of LOG_PATTERNS) {
    const match = line.match(pattern.regex);
    if (match) {
      const parsedLog = pattern.map(match);
      parsedLog.raw = line;
      parsedLog.level = normalizeLogLevel(parsedLog.level);
      return parsedLog;
    }
  }

  // If no pattern matches, return unparsed log line
  return {
    timestamp: null,
    level: 'INFO',
    message: "",
    raw: line,
    parsed: false
  };
};

interface ParsedLogs {
  buildDocker: ParsedLog[];
  webservice: ParsedLog[];
}

export const useParsedLogs = (logs: LogsResponse | undefined): ParsedLogs => {
  return useMemo(() => {
    if (!logs?.logs) {
      return {
        buildDocker: [],
        app: [],
        webservice: [],
      };
    }

    const parseLogSection = (content: string): ParsedLog[] => {
      if (content === undefined) return [
        {
          timestamp: null,
          level: "WARN",
          message: "No Logs Found :(",
          raw: "",
          parsed: true,
        }
      ]

      return content
        .split('\n')
        .map(parseLogLine);
    };

    const parsedLogs = {
      buildDocker: parseLogSection(logs.logs['build-docker']),
      webservice: parseLogSection(logs.logs.webservice),
    };

    return parsedLogs;
  }, [logs]);
};

interface LogFilters {
  search: string;
  levels: Set<string>;
  showUnparsed: boolean;
  showRawLog: boolean
}

const getLevelColor = (level: string): string => {
  switch (level) {
    case 'ERROR':
    case 'FATAL':
    case 'CRITICAL':
    case 'SEVERE':
      return 'text-red-500';
    case 'WARNING':
    case 'WARN':
      return 'text-yellow-500';
    case 'INFO':
    case 'NOTICE':
      return 'text-blue-500';
    case 'DEBUG':
    case 'TRACE':
    case 'VERBOSE':
      return 'text-gray-500';
    default:
      return 'text-foreground';
  }
};

const LevelSelect = ({ selectedLevel, onLevelChange, KNOWN_LEVELS, getLevelColor }: any) => {
  // Format display value
  const getDisplayValue = () => {
    if (selectedLevel === 'all') return 'All Levels';
    return selectedLevel || 'Select log level';
  };

  return (
    <Select
      value={selectedLevel}
      onValueChange={onLevelChange}
    >
      <SelectTrigger className="w-48">
        <SelectValue>
          {selectedLevel ? (
            <span className={selectedLevel !== 'all' ? getLevelColor(selectedLevel) : ''}>
              {getDisplayValue()}
            </span>
          ) : (
            'Select log level'
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center">
            <span>All Levels</span>
          </div>
        </SelectItem>
        {KNOWN_LEVELS.map((level: any) => (
          <SelectItem key={level} value={level}>
            <div className="flex items-center">
              <span className={getLevelColor(level)}>{level}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};


const FilterControls: React.FC<{
  filters: LogFilters;
  onChange: (filters: LogFilters) => void;
}> = ({ filters, onChange }) => {

  const [selectedLevel, setSelectedLevel] = useState('all');
  const updateFilters = (updates: Partial<LogFilters>) => {
    onChange({ ...filters, ...updates });
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 relative">
        <Search className="absolute left-2 h-4 w-4 text-gray-500" />
        <Input
          type="text"
          placeholder="Search logs..."
          className="w-full pl-8 pr-10 py-2 border rounded"
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
        />
        <Accordion type="single" collapsible className="absolute right-0 mr-3">
          <AccordionItem value="filters" className="border-none">
            <AccordionTrigger className="p-0 hover:no-underline" />
            <AccordionContent className="absolute right-0 top-full mt-2 w-55 z-50">
              <div className="space-y-4 p-4 border shadow-lg rounded-md bg-background">
                <div>
                  <label className="block text-sm font-medium mb-1">Log Levels</label>
                  <LevelSelect
                    selectedLevel={selectedLevel}
                    onLevelChange={(lvl: string) => {
                      setSelectedLevel(lvl);
                      const newLevels = lvl === 'all'
                        ? new Set(KNOWN_LEVELS)
                        : new Set([lvl]);
                      updateFilters({ levels: newLevels });
                    }}
                    KNOWN_LEVELS={KNOWN_LEVELS}
                    getLevelColor={getLevelColor}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showUnparsed"
                    checked={filters.showUnparsed}
                    onCheckedChange={(checked) =>
                      updateFilters({
                        showUnparsed: checked === "indeterminate" ? false : checked
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="showUnparsed" className="text-sm">
                    Show unparsed logs
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showUnparsed"
                    checked={filters.showRawLog}
                    onCheckedChange={(checked) =>
                      updateFilters({
                        showRawLog: checked === "indeterminate" ? false : checked
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="showUnparsed" className="text-sm">
                    Show Raw Logs
                  </label>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );

};

const LogDisplay: React.FC<{ logs: ParsedLog[], isLoading: boolean }> = ({ logs, isLoading }) => {
  const [filters, setFilters] = useState<LogFilters>({
    search: '',
    levels: new Set(KNOWN_LEVELS),
    showUnparsed: true,
    showRawLog: false
  });

  const filteredLogs = useMemo(() => {
    return logs
      .filter(log => {
        if (!filters.showUnparsed && !log.parsed) {
          return false;
        }
        if (!filters.levels.has(log.level)) {
          return false;
        }
        return true;
      })
      .filter(log => {
        if (!filters.search) return true;
        const searchLower = filters.search.toLowerCase();
        return (
          log.message.toLowerCase().includes(searchLower) ||
          log.level.toLowerCase().includes(searchLower) ||
          (log.timestamp && log.timestamp.toLocaleString().toLowerCase().includes(searchLower))
        );
      });
  }, [logs, filters]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none">
        <FilterControls filters={filters} onChange={setFilters} />
      </div>
      <WithLoadingContainer isLoading={isLoading} loadingText="Loading Logs">
        <div className="flex-grow w-full">
          {filteredLogs.map((log, index) => (
            <div
              key={index}
              className="py-1 px-2 rounded whitespace-pre-wrap"
            >
              {filters.showRawLog ? (
                <div className="text-xs text-gray-500">
                  {log.raw}
                </div>
              ) : (
                <div>
                  {log.message && (
                    <div className="flex items-start gap-2 min-w-0">
                      {log.timestamp && (
                        <span className="text-sm text-gray-500 whitespace-nowrap shrink-0">
                          {log.timestamp.toLocaleString()}
                        </span>
                      )}
                      <span className={`text-sm font-medium whitespace-nowrap shrink-0 min-w-[30px] ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                      <span className="text-sm flex-1 whitespace-pre-wrap break-words">
                        {log.message}
                      </span>
                    </div>
                  )}
                  {!log.parsed && (
                    <div className="text-xs text-gray-500 mt-1">
                      {log.raw}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </WithLoadingContainer>
    </div>
  );
};

export default LogDisplay;
