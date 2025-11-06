import '@/styles/observer-terminal.css';

import React, { useCallback,useEffect, useRef, useState } from 'react';

import { all,initDb } from '@/db/sql';
import { useTerminalStore } from '@/stores/useTerminalStore';
import { getRandomQuantumQuote } from '@/utils/quantum-quotes';

export const ObserverTerminal: React.FC = () => {
  const {
    isOpen,
    isUnlocked,
    history,
    commandHistory,
    blurEnabled,
    close,
    addCommand,
    clear,
    toggleBlur,
    collapseState,
  } = useTerminalStore();

  const [currentCommand, setCurrentCommand] = useState('');
  const [commandIndex, setCommandIndex] = useState(-1);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const [matrixText, setMatrixText] = useState<string>('');
  const [showMatrixSequence, setShowMatrixSequence] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new output is added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history, commandHistory]);

  // Focus input when terminal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Matrix text sequence on first render
  useEffect(() => {
    if (isOpen && isFirstRender) {
      setShowMatrixSequence(true);
      setMatrixText('');
      
      const matrixMessages = [
        'Wake up, Neo...',
        'The Matrix has you...',
        'Follow the white rabbit.',
      ];
      
      let messageIndex = 0;
      let charIndex = 0;
      
      const typeWriter = () => {
        if (messageIndex < matrixMessages.length) {
          const currentMessage = matrixMessages[messageIndex]!;
          if (charIndex < currentMessage.length) {
            setMatrixText(currentMessage.slice(0, charIndex + 1));
            charIndex++;
            setTimeout(typeWriter, 50); // Character delay
          } else {
            // Move to next message after a pause
            setTimeout(() => {
              messageIndex++;
              charIndex = 0;
              if (messageIndex < matrixMessages.length) {
                setMatrixText('');
                setTimeout(typeWriter, 500); // Pause between messages
              } else {
                // Sequence complete
                setTimeout(() => {
                  setShowMatrixSequence(false);
                  setIsFirstRender(false);
                }, 1000);
              }
            }, 1500); // Pause at end of message
          }
        }
      };
      
      setTimeout(typeWriter, 500); // Initial delay
    }
  }, [isOpen, isFirstRender]);

  // Apply blur effect to main content
  useEffect(() => {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      if (blurEnabled) {
        mainContent.classList.add('quantum-blur');
      } else {
        mainContent.classList.remove('quantum-blur');
      }
    }
    return () => {
      if (mainContent) {
        mainContent.classList.remove('quantum-blur');
      }
    };
  }, [blurEnabled]);

  const handleCommand = useCallback(
    async (cmd: string) => {
      const trimmedCmd = cmd.trim().toLowerCase();
      let output = '';

      switch (trimmedCmd) {
        case 'help':
          output = `Available commands:
  help          - Show this help message
  clear         - Clear terminal output
  measure       - Toggle blur effect on main UI
  cat /dev/quantum - Show random philosophical quote
  state         - Show current quantum states (debug logs)
  history       - Show command history
  dbstate       - Show database state (tables, row counts, schema)
  database      - Show database state (tables, row counts, schema)
  exit          - Close terminal
  close         - Close terminal`;
          break;

        case 'clear':
          clear();
          return; // Don't add to history

        case 'measure':
          toggleBlur();
          output = blurEnabled
            ? 'Measurement stopped. Reality restored.'
            : 'Measuring... Observer effect activated.';
          break;

        case 'cat /dev/quantum':
        case 'cat /dev/quantum | less':
        case 'cat /dev/quantum | more': {
          const quote = getRandomQuantumQuote();
          output = `\n"${quote.quote}"\n\n  — ${quote.author}\n`;
          break;
        }

        case 'state':
        case 'states':
          if (history.length === 0) {
            output = 'No quantum states observed.';
          } else {
            output = `Quantum States (${history.length}):\n${history
              .slice(-20)
              .map(
                s =>
                  `  [${s.collapsed ? 'COLLAPSED' : 'SUPERPOSITION'}] ${s.message} | probability: ${s.probability.toFixed(2)}`
              )
              .join('\n')}`;
          }
          break;

        case 'history':
          if (commandHistory.length === 0) {
            output = 'No command history.';
          } else {
            output = `Command History:\n${commandHistory
              .slice(-20)
              .map((h, i) => `  ${i + 1}. ${h.command}`)
              .join('\n')}`;
          }
          break;

        case 'dbstate':
        case 'database': {
          try {
            await initDb();
            
            // Get table names and row counts
            const tables = all<{ name: string }>(
              "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            );
            
            // Get view names
            const views = all<{ name: string }>(
              "SELECT name FROM sqlite_master WHERE type='view' ORDER BY name"
            );
            
            let dbOutput = 'Database State:\n\n';
            
            // Tables with row counts
            dbOutput += 'Tables:\n';
            for (const table of tables) {
              const count = all<{ count: number }>(
                `SELECT COUNT(*) as count FROM ${table.name}`
              )[0];
              dbOutput += `  ${table.name}: ${count?.count || 0} rows\n`;
            }
            
            // Views
            if (views.length > 0) {
              dbOutput += '\nViews:\n';
              for (const view of views) {
                dbOutput += `  ${view.name}\n`;
              }
            }
            
            // Journal table statistics
            const journalStats = all<{
              total: number;
              deleted: number;
              active: number;
            }>(
              `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) as deleted,
                SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) as active
               FROM journal`
            )[0];
            
            if (journalStats) {
              dbOutput += '\nJournal Statistics:\n';
              dbOutput += `  Total entries: ${journalStats.total || 0}\n`;
              dbOutput += `  Active entries: ${journalStats.active || 0}\n`;
              dbOutput += `  Deleted entries: ${journalStats.deleted || 0}\n`;
            }
            
            // Schema info for main tables
            dbOutput += '\nTable Schemas:\n';
            for (const table of tables) {
              const columns = all<{
                cid: number;
                name: string;
                type: string;
                notnull: number;
                dflt_value: string | null;
                pk: number;
              }>(`PRAGMA table_info(${table.name})`);
              
              dbOutput += `  ${table.name}:\n`;
              for (const col of columns) {
                dbOutput += `    ${col.name} (${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''})\n`;
              }
            }
            
            output = dbOutput;
          } catch (error) {
            output = `Error querying database: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
          break;
        }

        case 'exit':
        case 'close':
          close();
          return;

        default:
          if (trimmedCmd) {
            output = `Command not found: ${cmd}. Type 'help' for available commands.`;
          }
      }

      if (output) {
        addCommand(cmd, output);
      }
    },
    [clear, toggleBlur, blurEnabled, history, commandHistory, addCommand, close]
  );
  
  // Handle async commands properly
  const handleCommandAsync = useCallback(
    async (cmd: string) => {
      await handleCommand(cmd);
    },
    [handleCommand]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (currentCommand.trim()) {
        handleCommandAsync(currentCommand);
        setCurrentCommand('');
        setCommandIndex(-1);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex =
          commandIndex === -1
            ? commandHistory.length - 1
            : Math.max(0, commandIndex - 1);
        setCommandIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]!.command);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (commandIndex !== -1) {
        const newIndex =
          commandIndex < commandHistory.length - 1 ? commandIndex + 1 : -1;
        setCommandIndex(newIndex);
        setCurrentCommand(newIndex === -1 ? '' : commandHistory[newIndex]!.command);
      }
    }
  };

  if (!isUnlocked) {
    return null;
  }

  return (
    <>
      <div
        className={`observer-terminal ${isOpen ? 'open' : ''} ${isFirstRender ? 'first-render' : ''}`}
      >
        <div className="terminal-header">
          <div className="terminal-title">
            <span className="psi-symbol">ψ</span> Observer Effect Terminal
          </div>
          <button className="terminal-close" onClick={close} aria-label="Close terminal">
            ×
          </button>
        </div>

        <div className="terminal-output" ref={outputRef}>
          {showMatrixSequence && (
            <div className="matrix-text-sequence" style={{ color: '#00FF41', marginBottom: '1rem' }}>
              {matrixText}
              {matrixText && <span className="matrix-cursor">_</span>}
            </div>
          )}
          
          {commandHistory.map((entry, idx) => (
            <div key={idx} className="terminal-command-entry">
              <div className="command-prompt">
                <span className="psi-prefix">ψ&gt;</span> {entry.command}
              </div>
              <div className="command-output">{entry.output}</div>
            </div>
          ))}

          {history.map(state => (
            <div
              key={state.id}
              className={`quantum-state ${state.collapsed ? 'collapsed' : 'superposition'}`}
              onClick={() => !state.collapsed && collapseState(state.id)}
            >
              <span className="state-label">
                [{state.collapsed ? 'COLLAPSED' : 'SUPERPOSITION'}]
              </span>
              <span className="state-message">{state.message}</span>
              <span className="state-probability">| probability: {state.probability.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="terminal-input-container">
          <span className="psi-prefix">ψ&gt;</span>
          <input
            ref={inputRef}
            type="text"
            className="terminal-input"
            value={currentCommand}
            onChange={e => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            autoFocus
          />
        </div>
      </div>
      <div className="quantum-waveform-overlay" />
    </>
  );
};

