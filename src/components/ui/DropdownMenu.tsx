import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface DropdownMenuItem {
  label?: string;
  icon?: string;
  onClick?: () => void;
  divider?: boolean;
  disabled?: boolean;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  items,
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Calculate menu position when it opens
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spacing = 8; // mt-2 = 8px

      if (align === 'right') {
        setMenuPosition({
          top: rect.bottom + spacing,
          right: window.innerWidth - rect.right,
        });
      } else {
        setMenuPosition({
          top: rect.bottom + spacing,
          left: rect.left,
        });
      }
    } else {
      setMenuPosition(null);
    }
  }, [isOpen, align]);

  // Handle click outside and scroll/resize
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        triggerRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    const handleResize = () => {
      if (isOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spacing = 8;

        if (align === 'right') {
          setMenuPosition({
            top: rect.bottom + spacing,
            right: window.innerWidth - rect.right,
          });
        } else {
          setMenuPosition({
            top: rect.bottom + spacing,
            left: rect.left,
          });
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen, align]);

  const handleItemClick = (item: DropdownMenuItem, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!item.disabled && item.onClick) {
      item.onClick();
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="page-header__btn page-header__btn--secondary no-print flex items-center gap-1"
        aria-label="Open menu"
        aria-expanded={isOpen}
      >
        {trigger}
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-9999 min-w-[180px] rounded-lg border border-[rgba(245,179,66,0.3)] bg-[rgba(11,15,14,0.88)] p-2 shadow-[0_0_60px_-20px_rgba(245,179,66,0.125),0_24px_72px_rgba(0,0,0,0.95)] backdrop-blur-[32px]"
            style={{
              top: `${menuPosition.top}px`,
              ...(menuPosition.left !== undefined ? { left: `${menuPosition.left}px` } : {}),
              ...(menuPosition.right !== undefined ? { right: `${menuPosition.right}px` } : {}),
            }}
          >
            {items.map((item, index) => (
              <React.Fragment key={index}>
                {item.divider && index > 0 && (
                  <div className="my-2 border-t border-[rgba(245,179,66,0.2)]" />
                )}
                {!item.divider && item.label && (
                  <button
                    onClick={e => handleItemClick(item, e)}
                    disabled={item.disabled}
                    className={`w-full rounded px-3 py-2 text-left text-sm text-[rgba(245,179,66,0.9)] transition-colors ${
                      item.disabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:bg-[rgba(245,179,66,0.08)] hover:text-[#F5B342] hover:shadow-[0_0_5px_rgba(245,179,66,0.075)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {item.icon && <span>{item.icon}</span>}
                      <span>{item.label}</span>
                    </div>
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};
