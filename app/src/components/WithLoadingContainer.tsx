import React, { useState, useEffect, ReactNode } from 'react';
import { cn } from "@/lib/utils";
import ProgressIcon from './ui/ProgressIcon';

type Position = 'left' | 'center' | 'right';

interface WithLoadingContainerProps {
  /** Whether the loading state is active */
  isLoading: boolean;
  /** Text to display while loading */
  loadingText?: string;
  /** Content to render when not loading */
  children: ReactNode;
  /** Horizontal alignment of the loading indicator */
  position?: Position;
  /** Option spinner type */
  spinner?: "circle" | "dots"
  /** Optional className for the container */
  className?: string;
}

const WithLoadingContainer: React.FC<WithLoadingContainerProps> = ({
  isLoading,
  loadingText = "Loading",
  children,
  position = "center",
  spinner = "circle",
  className
}) => {
  const [isFirstRender, setIsFirstRender] = useState(true);
  const [loadingOpacity, setLoadingOpacity] = useState(isLoading);
  const [contentOpacity, setContentOpacity] = useState(!isLoading);
  const [showLoader, setShowLoader] = useState(isLoading);
  const [showContent, setShowContent] = useState(!isLoading);

  useEffect(() => {
    setIsFirstRender(false);
  }, []);

  useEffect(() => {
    if (isFirstRender) return;

    let contentTimeout: ReturnType<typeof setTimeout>;
    let loaderTimeout: ReturnType<typeof setTimeout>;
    let animationFrame: number;

    if (!isLoading) {
      setLoadingOpacity(false);
      contentTimeout = setTimeout(() => {
        setShowContent(true);
        animationFrame = requestAnimationFrame(() => {
          setContentOpacity(true);
        });
      }, 300);
      loaderTimeout = setTimeout(() => {
        setShowLoader(false);
      }, 300);
    } else {
      setContentOpacity(false);
      contentTimeout = setTimeout(() => {
        setShowContent(false);
        animationFrame = requestAnimationFrame(() => {
          setLoadingOpacity(true);
        });
      }, 300);
      loaderTimeout = setTimeout(() => {
        setShowLoader(true);
      }, 300);
    }

    return () => {
      clearTimeout(contentTimeout);
      clearTimeout(loaderTimeout);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isLoading, isFirstRender]);

  const positionClasses: Record<Position, string> = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end"
  };

  return (
    <div className={cn("relative w-full min-h-[100px]", className)}>
      {showLoader && (
        <div
          className={cn(
            "absolute inset-0 flex items-center",
            !isFirstRender && "transition-opacity duration-300",
            positionClasses[position],
            loadingOpacity ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="flex items-center space-x-2">
            {spinner === "circle" && <ProgressIcon />}
            <span className="flex items-center">
              {loadingText}
              {spinner === "dots" && (
                <span className="flex space-x-px ml-1">
                  <span className="animate-bounce [animation-delay:0ms]">.</span>
                  <span className="animate-bounce [animation-delay:200ms]">.</span>
                  <span className="animate-bounce [animation-delay:400ms]">.</span>
                </span>
              )}
            </span>
          </div>
        </div>
      )}
      {showContent && (
        <div
          className={cn(
            !isFirstRender && "transition-opacity duration-300",
            contentOpacity ? "opacity-100" : "opacity-0"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default WithLoadingContainer;
