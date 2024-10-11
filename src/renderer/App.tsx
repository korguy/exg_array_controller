/* eslint-disable no-else-return */
/* eslint-disable jsx-a11y/no-noninteractive-element-to-interactive-role */
/* eslint-disable react/no-array-index-key */
/* eslint-disable no-console */
/* eslint-disable no-plusplus */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';

import AddIcon from '@mui/icons-material/Add';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import Radio from '@mui/material/Radio';
import TextField from '@mui/material/TextField';

const ARRAY_SIZE = 10;
const CELL_SIZE = 5;
const INITIAL_VALUE = -7;
const SCROLL_SPEED = 0.05;
const MIN_VALUE = INITIAL_VALUE;
const MAX_VALUE = 7;
const FLOAT_PRECISION = 1;

const SAVE_SCALE = 16382;
// 인터페이스에서 위 값을 쓰되 비율 유지해서 저장할때는 뒤집어서 5, 0 16382

interface ProcessState {
  name: string;
  array: number[][][];
  activeCell: {
    k: number;
    i: number;
    j: number;
  } | null;
  selectedArrayIndex: number | null;
  saved: boolean;
  lastSavedArray: number[][][];
  path: string;
}

const EMPTY_PROCESS_STATE: ProcessState = {
  name: 'Untitled',
  array: [],
  activeCell: null,
  selectedArrayIndex: null,
  saved: false,
  lastSavedArray: [],
  path: '',
};

const detectOS = () => {
  const platform = window.navigator.platform.toLowerCase();
  const userAgent = window.navigator.userAgent.toLowerCase();

  if (platform.includes('win')) {
    return 'Windows';
  } else if (platform.includes('mac')) {
    return 'MacOS';
  } else if (platform.includes('linux')) {
    return 'Linux';
  } else if (/android/.test(userAgent)) {
    return 'Android';
  } else if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'iOS';
  } else {
    return 'Unknown';
  }
};

const mapValues = (array: number[][][], save: boolean) => {
  if (save) {
    return array.map((plane) =>
      plane.map((row) =>
        row.map((value) =>
          Math.round(
            ((-value + MAX_VALUE) / (MAX_VALUE - MIN_VALUE)) * SAVE_SCALE,
          ),
        ),
      ),
    );
  }
  return array.map((plane) =>
    plane.map((row) =>
      row.map(
        (value) => -((MAX_VALUE - MIN_VALUE) / SAVE_SCALE) * value + MAX_VALUE,
      ),
    ),
  );
};

const compareArrays = (array1: number[][][], array2: number[][][]) => {
  if (array1.length !== array2.length) return false;
  for (let i = 0; i < array1.length; i++) {
    for (let j = 0; j < array1[i].length; j++) {
      for (let k = 0; k < array1[i][j].length; k++) {
        if (array1[i][j][k] !== array2[i][j][k]) return false;
      }
    }
  }
  return true;
};

const createMatrix = () => {
  return Array.from({ length: ARRAY_SIZE }, () =>
    Array.from({ length: ARRAY_SIZE }, () => INITIAL_VALUE),
  );
};

function ArrayCanvas({ arrayData }: { arrayData: number[][] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas instanceof HTMLCanvasElement) {
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = ARRAY_SIZE * CELL_SIZE;
        canvas.height = ARRAY_SIZE * CELL_SIZE;
        canvas.style.width = '80px';
        canvas.style.height = '80px';

        // eslint-disable-next-line no-plusplus
        for (let i = 0; i < ARRAY_SIZE; i++) {
          // eslint-disable-next-line no-plusplus
          for (let j = 0; j < ARRAY_SIZE; j++) {
            const value = arrayData[i][j];
            context.fillStyle = `rgba(109, 43, 46, ${(value + 7) / 7})`;
            context.fillRect(
              j * CELL_SIZE,
              i * CELL_SIZE,
              CELL_SIZE,
              CELL_SIZE,
            );
          }
        }
      }
    }
  }, [arrayData]);

  return <canvas ref={canvasRef} />;
}

function Main() {
  // Main Variables
  const [selectedProcessIndex, setSelectedProcessIndex] = useState<number>(0);
  const [processState, setProcessState] = useState<ProcessState[]>([
    structuredClone(EMPTY_PROCESS_STATE),
  ]);
  const selectedProcessIndexRef = useRef(selectedProcessIndex);
  const processStateRef = useRef(processState);

  useEffect(() => {
    selectedProcessIndexRef.current = selectedProcessIndex;
    processStateRef.current = processState;
  }, [selectedProcessIndex, processState]);

  // Options
  const [showValues, setShowValues] = useState(false);
  const [enableDragToCopy, setEnableDragToCopy] = useState(false);
  const [enableScrollToChange, setEnableScrollToChange] = useState(true);

  // Miscallenous
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [activeValue, setActiveValue] = useState<number | null>(null);
  const copiedArray = useRef<number[][] | null>(null);
  const [os, setOs] = useState('Unknown');

  const increaseArrayLength = () => {
    setProcessState((prevProcessState) => {
      const newProcessState = prevProcessState.map((process, idx) => {
        if (idx === selectedProcessIndex) {
          const newArray = [...process.array, createMatrix()];
          const t = newArray.length;
          return {
            ...process,
            array: newArray,
            selectedArrayIndex: t - 1,
          };
        }
        return process;
      });
      return newProcessState;
    });
  };

  const updateActiveCell = (
    newActiveCell: {
      k: number;
      i: number;
      j: number;
    } | null,
  ) => {
    setProcessState((prevProcessState) => {
      return prevProcessState.map((process, processIndex) => {
        if (selectedProcessIndex === processIndex) {
          return {
            ...process,
            activeCell: newActiveCell,
          };
        }
        return process;
      });
    });
  };

  const removeArrayAtIndex = (indexToRemove: number) => {
    setProcessState((prevProcessState) => {
      const newProcessState = prevProcessState.map((process, processIndex) => {
        if (selectedProcessIndex === processIndex) {
          const t = process.array.length;

          // Validate indexToRemove
          if (indexToRemove < 0 || indexToRemove >= t) {
            return process; // No changes if index is out of bounds
          }

          // Remove the array at indexToRemove
          const newArray = process.array.filter(
            (_, idx) => idx !== indexToRemove,
          );

          // Update selectedArrayIndex based on the removed index
          let newSelectedArrayIndex = process.selectedArrayIndex;
          if (newSelectedArrayIndex !== null) {
            if (indexToRemove > newSelectedArrayIndex) {
              // Do nothing, selected index remains the same
            } else if (indexToRemove < newSelectedArrayIndex) {
              newSelectedArrayIndex -= 1;
            } else if (indexToRemove === newSelectedArrayIndex) {
              if (t > 1) {
                newSelectedArrayIndex = Math.max(0, t - 2);
              } else {
                newSelectedArrayIndex = null;
              }
            }
          }

          return {
            ...process,
            array: newArray,
            selectedArrayIndex: newSelectedArrayIndex,
            activeCell: null, // Reset activeCell
          };
        }
        return process;
      });
      return newProcessState;
    });
  };

  const insertArray = (newArray2D: number[][]) => {
    setProcessState((prevProcessState) =>
      prevProcessState.map((process, idx) => {
        if (idx === selectedProcessIndexRef.current) {
          const { selectedArrayIndex } = process;
          const currentArray = process.array;

          // Determine the insertion index
          const insertIndex =
            selectedArrayIndex !== null
              ? selectedArrayIndex + 1
              : currentArray.length;

          // Create a new array with the new 2D array inserted
          const newArray = [...currentArray];
          newArray.splice(insertIndex, 0, newArray2D);

          // Optionally update selectedArrayIndex to the new array's index
          const newSelectedArrayIndex = insertIndex;

          // Return the updated process
          return {
            ...process,
            array: newArray,
            selectedArrayIndex: newSelectedArrayIndex,
          };
        } else {
          return process; // No change for other processes
        }
      }),
    );
  };

  const removeProcessAtIndex = (indexToRemove: number) => {
    setProcessState((prevProcessState) => {
      const newProcessState = prevProcessState.filter(
        (_, idx) => idx !== indexToRemove,
      );
      setSelectedProcessIndex((prev) => {
        if (prev === indexToRemove) {
          return Math.max(0, prev - 1);
        }
        return prev;
      });
      return newProcessState;
    });
  };

  const updateSelectedArrayIndex = (newIndex: number) => {
    setProcessState((prevProcessState) => {
      const newProcessState = prevProcessState.map((process, processIndex) => {
        if (selectedProcessIndex === processIndex) {
          return {
            ...process,
            selectedArrayIndex: newIndex,
          };
        }
        return process;
      });
      return newProcessState;
    });
  };

  const updateElement = useCallback(
    (k: number, i: number, j: number, value: number) => {
      const clampedValue = Number(
        Math.max(MIN_VALUE, Math.min(MAX_VALUE, value)).toFixed(
          FLOAT_PRECISION,
        ),
      );

      setProcessState((prevProcessState) => {
        const newProcessState = prevProcessState.map(
          (process, processIndex) => {
            if (selectedProcessIndex === processIndex) {
              const newArray = process.array.map((plane) =>
                plane.map((row) => row.slice()),
              );

              // Update the specific element
              newArray[k][i][j] = clampedValue;

              // Return a new process object with the updated array
              return {
                ...process,
                array: newArray,
              };
            }
            // Return other processes unchanged
            return process;
          },
        );

        return newProcessState;
      });
    },
    [setProcessState, selectedProcessIndex],
  );

  const handleWheel = useCallback(
    (e: any, k: number, i: number, j: number) => {
      const delta = -e.deltaY * SCROLL_SPEED; // Or use SCROLL_SPEED if defined
      const currentValue = processState[selectedProcessIndex].array[k][i][j];
      updateElement(k, i, j, currentValue + delta);
      e.preventDefault();
      e.stopPropagation();
    },
    [processState, selectedProcessIndex, updateElement],
  );

  const updateSelectedProcessIndex = (newIndex: number) => {
    setSelectedProcessIndex(newIndex);
    window.electronAPI.setTitle(processState[newIndex].name);
  };

  const updateNameAndPath = (newName: string, newPath: string) => {
    setProcessState((prevProcessState) => {
      const newProcessState = prevProcessState.map((process, idx) => {
        if (idx === selectedProcessIndexRef.current) {
          const newArray = [...process.array, createMatrix()];
          const t = newArray.length;
          return {
            ...process,
            name: newName,
            path: newPath,
            saved: true,
            lastSavedArray: process.array,
          };
        }
        return process;
      });
      return newProcessState;
    });
  };

  async function saveFile(saveAs: boolean) {
    try {
      const currentProcess =
        processStateRef.current[selectedProcessIndexRef.current];
      if (!saveAs && currentProcess.path !== '') {
        // eslint-disable-next-line no-param-reassign
        saveAs = false;
      }
      const saveDir = saveAs ? '' : currentProcess.path;
      const result = await window.electronAPI.sendDataToMain({
        data: mapValues(currentProcess.array, true),
        saveDir,
      });
      if (result.success) {
        if (os === 'Windows') {
          const fileName = result.fileName
            .replace(/\//g, '\\')
            .split('/')
            .pop();
        } else {
          const fileName = result.fileName.split('/').pop();
        }
        updateNameAndPath(fileName, result.fileName);
        window.electronAPI.setTitle(fileName);
      } else {
        console.error('Failed to save data:', result.error);
      }
    } catch (error) {
      console.error('An error occurred:', error);
    }
  }

  useEffect(() => {
    const currentOS = detectOS();
    setOs(currentOS);

    // Register Event Handlers
    const copyHandler = (deleteCopy: boolean) => {
      try {
        const currentProcess =
          processStateRef.current[selectedProcessIndexRef.current];
        const currentArray =
          currentProcess.array[currentProcess.selectedArrayIndex ?? 0];
        copiedArray.current = currentArray;
        if (deleteCopy) {
          console.log(
            'Deleting array at index:',
            currentProcess.selectedArrayIndex,
          );
          removeArrayAtIndex(currentProcess.selectedArrayIndex ?? 0);
        }
        console.log('Copied array:', currentArray);
      } catch (error) {
        console.error('Error copying array:', error);
      }
    };

    const pasteHandler = (dummy: boolean) => {
      if (copiedArray.current) {
        insertArray(copiedArray.current);
      }
    };

    const newFileHandler = () => {
      setProcessState((prevProcessState) => {
        const newProcessState = [
          ...prevProcessState,
          structuredClone(EMPTY_PROCESS_STATE),
        ];
        setSelectedProcessIndex(newProcessState.length - 1);
        return newProcessState;
      });
      window.electronAPI.setTitle('Untitled');
    };

    const saveFileHandler = (saveAs: boolean) => {
      saveFile(saveAs);
    };

    const handleMouseUp = () => {
      setIsMouseDown(false);
      setActiveValue(null);
    };

    const handleFileOpen = (result: any) => {
      if (result.error) {
        console.error('Error opening file:', result.error);
      } else {
        console.log('File opened:', result.filePath);
        try {
          const content = JSON.parse(result.content);
          if (
            Array.isArray(content) &&
            content.every(
              (plane) =>
                Array.isArray(plane) &&
                plane.every((row) => Array.isArray(row)),
            )
          ) {
            if (os === 'Windows') {
              const fileName = result.fileName
                .replace(/\//g, '\\')
                .split('/')
                .pop();
            } else {
              const fileName = result.fileName.split('/').pop();
            }
            setProcessState((prevState) => {
              const newProcessState = [
                ...prevState,
                {
                  ...EMPTY_PROCESS_STATE,
                  name: fileName,
                  path: result.filePath,
                  array: mapValues(content, false),
                  selectedArrayIndex: 0,
                  saved: true,
                  lastSavedArray: content,
                },
              ];
              setSelectedProcessIndex(newProcessState.length - 1);
              return newProcessState;
            });
            window.electronAPI.setTitle(fileName);
          } else {
            console.error('Invalid file content: not a 3D array');
          }
        } catch (error) {
          console.error('Error parsing file content:', error);
        }
      }
    };

    // Add event listeners
    console.log('Adding save file handler');
    window.electronAPI.onRequestNewFile(newFileHandler);
    window.electronAPI.onRequestSaveFile(saveFileHandler);
    window.electronAPI.onOpenFile(handleFileOpen);
    window.electronAPI.onRequestCopy(copyHandler);
    window.electronAPI.onRequestPaste(pasteHandler);
    window.addEventListener('mouseup', handleMouseUp);

    // Cleanup function
    return () => {
      // Remove event listeners
      window.electronAPI.removeListener('request-new-file', newFileHandler);
      window.electronAPI.removeListener('request-save-file', saveFileHandler);
      window.electronAPI.removeListener('open-file-result', handleFileOpen);
      window.electronAPI.removeListener('request-copy', copyHandler);
      window.electronAPI.removeListener('request-paste', pasteHandler);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []); // Empty dependency array

  useEffect(() => {
    console.log('Updated processState:', processState);
    console.log('Updated selectedProcessIndex:', selectedProcessIndex);
  }, [processState, selectedProcessIndex]);

  useEffect(() => {
    const updatedProcessState = processState.map((process) => ({
      ...process,
      saved: compareArrays(process.array, process.lastSavedArray),
    }));

    if (JSON.stringify(updatedProcessState) !== JSON.stringify(processState)) {
      setProcessState(updatedProcessState);
    }
  }, [processState]);

  return (
    <div className="main-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <p className="sidebar-header-text">OPEN FILES</p>
          {processState.length > 0 &&
            processState.map((process, index) => {
              return (
                <div
                  className="sidebar-file-container"
                  style={{
                    backgroundColor:
                      selectedProcessIndex !== index
                        ? 'var(--main-color)'
                        : 'var(--focus-color)',
                    color:
                      selectedProcessIndex !== index
                        ? 'black'
                        : 'var(--main-color)',
                  }}
                  onClick={() => {
                    updateSelectedProcessIndex(index);
                  }}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && updateSelectedProcessIndex(index)
                  }
                  tabIndex={0}
                  role="button"
                  aria-label="Select item"
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <p
                      className="icon"
                      style={{
                        visibility: process.saved ? 'hidden' : 'visible',
                      }}
                    >
                      &#9679;
                    </p>
                    <p className="sidebar-file-text">{process.name}</p>
                  </div>
                  <p
                    className="x-icon"
                    onClick={() => removeProcessAtIndex(index)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && removeProcessAtIndex(index)
                    }
                    tabIndex={0}
                    role="button"
                    aria-label="Remove item"
                  >
                    ✕
                  </p>
                </div>
              );
            })}
        </div>
      </div>
      <div className="main-content">
        <div className="main-content-preview">
          <div className="preview-container">
            {processState[selectedProcessIndex]?.array.map((_array, k) => (
              <div
                className={`preview-content ${k === processState[selectedProcessIndex].selectedArrayIndex ? 'selected' : ''}`}
                key={k}
                onClick={() => {
                  updateSelectedArrayIndex(k);
                }}
                onKeyDown={(e) =>
                  e.key === 'Enter' && updateSelectedArrayIndex(k)
                }
                tabIndex={0}
                role="button"
                aria-label="Select item"
              >
                <ArrayCanvas
                  arrayData={processState[selectedProcessIndex].array[k]}
                />
                <div
                  className="preview-content-remove-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeArrayAtIndex(k);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && removeArrayAtIndex(k)}
                  tabIndex={0}
                  role="button"
                  aria-label="Remove item"
                >
                  <CancelRoundedIcon />
                </div>
              </div>
            ))}
            <div
              className="preview-content add-button"
              onClick={() => increaseArrayLength()}
              onKeyDown={(e) => e.key === 'Enter' && increaseArrayLength()}
              role="button"
              tabIndex={0}
              aria-label="Add new array"
            >
              <div className="add-array-button">
                <AddIcon />
              </div>
            </div>
          </div>
        </div>
        <div className="main-content-editor">
          {processState[selectedProcessIndex]?.array.length > 0 &&
            processState[selectedProcessIndex]?.selectedArrayIndex !== null && (
              <div className="array-editor">
                <div className="array-editor-content">
                  {processState[selectedProcessIndex].array[
                    processState[selectedProcessIndex].selectedArrayIndex
                  ]?.map((row, i) =>
                    row.map((value, j) => (
                      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                      <div
                        // eslint-disable-next-line react/no-array-index-key
                        key={`${selectedProcessIndex}-${processState[selectedProcessIndex].selectedArrayIndex}-${i}-${j}`}
                        id={`${selectedProcessIndex}-${processState[selectedProcessIndex].selectedArrayIndex}-${i}-${j}`}
                        onWheel={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (enableScrollToChange) {
                            handleWheel(
                              e,
                              processState[selectedProcessIndex]
                                .selectedArrayIndex ?? 0,
                              i,
                              j,
                            );
                          }
                        }}
                        style={{
                          backgroundColor: `rgba(109, 43, 46, ${(value + 7) / 7})`,
                          color: value <= 0.5 ? 'black' : 'white',
                          outline:
                            processState[selectedProcessIndex].activeCell?.i ===
                              i &&
                            processState[selectedProcessIndex].activeCell?.j ===
                              j &&
                            processState[selectedProcessIndex].activeCell?.k ===
                              processState[selectedProcessIndex]
                                .selectedArrayIndex
                              ? '1.5px solid #423f45'
                              : '1px solid #cccccc62',
                        }}
                        className="array-cell"
                        onClick={() =>
                          updateActiveCell({
                            k:
                              processState[selectedProcessIndex]
                                .selectedArrayIndex ?? 0,
                            i,
                            j,
                          })
                        }
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (enableDragToCopy) {
                            setIsMouseDown(true);
                            const currentValue =
                              processState[selectedProcessIndex].array[
                                processState[selectedProcessIndex]
                                  .selectedArrayIndex ?? 0
                              ][i][j];
                            setActiveValue(currentValue);
                            updateElement(
                              processState[selectedProcessIndex]
                                .selectedArrayIndex ?? 0,
                              i,
                              j,
                              currentValue,
                            );
                          }
                        }}
                        onMouseEnter={() => {
                          if (
                            enableDragToCopy &&
                            isMouseDown &&
                            activeValue !== null
                          ) {
                            updateElement(
                              processState[selectedProcessIndex]
                                .selectedArrayIndex ?? 0,
                              i,
                              j,
                              activeValue,
                            );
                          }
                        }}
                        onMouseUp={() => {
                          setIsMouseDown(false);
                          setActiveValue(null);
                        }}
                      >
                        <p
                          style={{
                            visibility: showValues ? 'visible' : 'hidden',
                          }}
                        >
                          {value}
                        </p>
                      </div>
                    )),
                  )}
                </div>
                <div className="menu-bar">
                  <p className="menu-bar-title">Options</p>
                  <div className="menu-bar-option">
                    <Radio
                      checked={showValues}
                      onClick={() => setShowValues((prev) => !prev)}
                      value="a"
                      name="radio-buttons"
                      inputProps={{ 'aria-label': 'Show Values' }}
                      size="small"
                    />
                    <p>Show Values</p>
                  </div>
                  <div className="menu-bar-option">
                    <Radio
                      checked={enableDragToCopy}
                      onClick={() => setEnableDragToCopy((prev) => !prev)}
                      value="b"
                      name="radio-buttons-2"
                      inputProps={{ 'aria-label': 'Drag To Copy' }}
                      size="small"
                    />
                    <p>Enable Drag To Copy</p>
                  </div>
                  <div className="menu-bar-option">
                    <Radio
                      checked={enableScrollToChange}
                      onClick={() => setEnableScrollToChange((prev) => !prev)}
                      value="b"
                      name="radio-buttons-2"
                      inputProps={{ 'aria-label': 'Drag To Copy' }}
                      size="small"
                    />
                    <p>Enable Scroll To Change</p>
                  </div>
                  {processState[selectedProcessIndex].activeCell && (
                    <TextField
                      style={{ marginTop: '10px', width: '150px' }}
                      id="outlined-number"
                      label="Current Value"
                      type="number"
                      value={
                        processState[selectedProcessIndex].array[
                          processState[selectedProcessIndex].activeCell.k
                        ][processState[selectedProcessIndex].activeCell.i][
                          processState[selectedProcessIndex].activeCell.j
                        ]
                      }
                      onChange={(e) => {
                        const { activeCell } =
                          processState[selectedProcessIndex];
                        if (activeCell) {
                          updateElement(
                            activeCell.k,
                            activeCell.i,
                            activeCell.j,
                            parseFloat(e.target.value),
                          );
                        }
                      }}
                      slotProps={{
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                    />
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Main />} />
      </Routes>
    </Router>
  );
}
