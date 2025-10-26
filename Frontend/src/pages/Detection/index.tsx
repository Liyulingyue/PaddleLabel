import { useEffect, useState, useRef } from 'react';
import { useUpdateEffect } from 'ahooks';
import { Spin, message } from 'antd';
import { history, useModel } from 'umi';
import styles from './index.less';
import PPLabelPageContainer from '@/components/PPLabelPage/PPLabelPageContainer';
import PPToolBarButton from '@/components/PPLabelPage/PPToolBarButton';
import PPToolBar from '@/components/PPLabelPage/PPToolBar';
import PPLabelList from '@/components/PPLabelPage/PPLabelList';
import type { pageRef } from '@/components/PPLabelPage/PPStage';
import PPStage from '@/components/PPLabelPage/PPStage';
import useImage from 'use-image';
import { ectInteractorToAnnotation } from '@/components/PPDrawTool/PPInteractor';
// import type { Label } from '@/models/';
import PPAnnotationList from '@/components/PPLabelPage/PPAnnotationList';
import { PageInit, ModelUtils } from '@/services/utils';
import type { Annotation } from '@/models/Annotation';
import PPRectangle from '@/components/PPDrawTool/PPRectangle';
import PPProgress from '@/components/PPLabelPage/PPProgress';
import { IntlInitJsx } from '@/components/PPIntl';
import PPSetButton from '@/components/PPLabelPage/PPButtonSet';
import Keyevent from 'react-keyevent';
import InferenceConfig from './components/InferenceConfig';
const port = window.location.port == '8000' ? '1234' : window.location.port;
const baseUrl = `http://${window.location.hostname}:${port}/`;
const Page = () => {
  // todo: change to use annotation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [frontendId, setFrontendId] = useState<number>(0);
  const [isClick, setisClick] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { interactorData, setInteractorData } = useModel('InteractorData');
  const [threshold, setThreshold] = useState<number>(0.5);
  const [mlBackendUrl, setMlBackendUrl] = useState<string>('http://localhost:8001');
  const [inferenceEnabled, setInferenceEnabled] = useState<boolean>(false);
  const [showInferConfig, setShowInferConfig] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [uploadedModelFile, setUploadedModelFile] = useState<File | null>(null);
  const [isLoad, setIsLoad] = useState<boolean>(false);
  const [otherSetting, setotherSetting] = useState<any>();
  const [flags, setflags] = useState<boolean>(false);
  const [preTools, setPreTools] = useState<string>('');
  const [hideLabel, setHideLabel] = useState<number[]>([]);
  // const [onSelect, setOnSelect] = useState<Annotation>();

  const model = ModelUtils(useState, baseUrl);
  const page = useRef<pageRef>(null);
  const tbIntl = IntlInitJsx('pages.toolBar');

  const { tool, loading, scale, annotation, task, data, project, label, annHistory } = PageInit(
    useState,
    useEffect,
    {
      effectTrigger: {
        postTaskChange: (allLabels, allAnns) => {
          annHistory.init({ annos: allAnns });
        },
      },
      label: {
        oneHot: true,
        postSelect: () => {
          annotation.setCurr(undefined);
          setFrontendId(0);
        },
        preUnsetCurr: preCurrLabelUnset,
      },
      tool: { defaultTool: 'mover' },
      task: {
        push: false,
      },
    },
  );

  // 当 project.curr 变化时自动同步 mlBackendUrl
  useEffect(() => {
    if (project.curr?.otherSettings?.mlBackendUrl) {
      setMlBackendUrl(project.curr.otherSettings.mlBackendUrl);
    }
  }, [project.curr?.otherSettings?.mlBackendUrl]);
  const [image] = useImage(data.imgSrc || '', 'anonymous');
  function preCurrLabelUnset() {
    annotation.setCurr(undefined);
    setFrontendId(0);
    tool.setCurr('mover');
    setPreTools('mover');
  }

  const setCurrentAnnotation = (anno?: Annotation) => {
    annotation.setCurr(anno);
    if (!anno?.frontendId) setFrontendId(0);
    else setFrontendId(anno.frontendId);
  };

  const onAnnotationModify = (anno: Annotation) => {
    const newAnnos = [];
    for (const item of annotation.all) {
      if (item.frontendId == anno.frontendId) {
        const result = anno?.result?.split(',').map((items: string) => {
          return Number(items);
        }) as number[];
        const area = (result[2] - result[0]) * (result[3] - result[1]);
        if (Math.abs(area) > 10) {
          newAnnos.push(anno);
          setCurrentAnnotation(anno);
        }
      } else {
        newAnnos.push(item);
      }
    }
    // annHistory.record({ annos: annotation.all, currAnno: annotation.curr });
    annotation.setAll(newAnnos);
    annotation.update(anno);
  };
  const onAnnotationModifyUP = (anno: Annotation) => {
    const newAnnos = [];
    for (const item of annotation.all) {
      if (item.frontendId == anno.frontendId) {
        newAnnos.push(anno);
      } else {
        newAnnos.push(item);
      }
    }
    setCurrentAnnotation(anno);
    annotation.setAll(newAnnos);
    annotation.update(anno);
  };
  const onStartEdit = () => {
    setisClick(true);
  };
  const onEndEdit = () => {
    setisClick(false);
  };
  const onFinishEdit = () => {
    // 鼠标抬起的时候
    // console.log('here');
    annHistory.record({ annos: annotation.all, currAnno: annotation.curr });

    if (!annotation.curr) return;
    // debugger;
    if (!annotation.curr.result) return;
    const lengths = annotation.all.length - 1;
    const ErrAnno = annotation.all[lengths];
    if (ErrAnno && ErrAnno?.result?.split(',').length === 2) {
      const newResult = ErrAnno?.result.split(',').concat(annotation?.curr?.result.split(','));
      annotation.curr.result = newResult.join(',');
    }
    if (annotation?.curr?.result.split(',').length < 3) {
      setCurrentAnnotation(undefined);
      return;
    }
    if (annotation?.curr?.annotationId == undefined) {
      annotation.create(annotation?.curr);
    } else {
      annotation.update(annotation?.curr);
    }
    message.success(tbIntl('saveSuccess'));
    if (tool.curr == 'rectangle') setCurrentAnnotation(undefined);
  };

  const drawToolParam = {
    dataId: data.curr?.dataId,
    currentLabel: label.curr,
    scale: scale.curr,
    currentTool: tool.curr,
    annotations: annotation.all,
    currentAnnotation: annotation.curr,
    onAnnotationAdd: (anno: Annotation) => {
      const newAnnos = annotation.all.concat([anno]);
      // debugger;
      annotation.setAll(newAnnos);
      setCurrentAnnotation(anno);
    },
    onAnnotationModify: onAnnotationModify,
    onDragUP: onAnnotationModifyUP,
    modifyAnnoByFrontendId: onAnnotationModify,
    onMouseUp: onEndEdit,
    onMouseDown: onStartEdit,
    frontendIdOps: { frontendId: frontendId, setFrontendId: setFrontendId },
    pathName: history?.location?.pathname,
    ChanegeTool: (tools: any) => {
      tool.setCurr(tools);
    },
    preTool: preTools,
  };

  const rectagle = PPRectangle(drawToolParam);

  const drawTool = { rectangle: rectagle, brush: undefined };
  const setAnnotation = (select: Annotation) => {
    const items = annotation.all;
    const id = select.annotationId;
    const item = items.find((i) => i.annotationId === id);
    if (item) {
      const index = items.indexOf(item);
      items.splice(index, 1);
      // add to the top
      items.push(item);
      annotation.setAll(items);
    }
  };

  const getMaxFrontendId = (annotations?: Annotation[]) => {
    if (!annotations || annotations.length == 0) return 0;
    let max = 0;
    for (const annotationItem of annotations) {
      if (annotationItem.frontendId > max) max = annotationItem.frontendId;
    }
    return max;
  };
  const getBase64Image = (img?: HTMLImageElement) => {
    if (!img) return '';
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0, img.width, img.height);
    const dataURL = canvas.toDataURL('image/png');

    return dataURL.replace(/^data:image\/(png|jpg);base64,/, '');
  };
  const onPredicted = (images: HTMLImageElement) => {
    const imgBase64 = getBase64Image(images);
    const thresholdRaw = threshold ? threshold : 0.5;
    
    // 直接调用自定义后端的 /infer API
    if (selectedService === 'custom' && mlBackendUrl) {
      fetch(`${mlBackendUrl}/infer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imgBase64,
          conf_threshold: thresholdRaw
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: any) => {
        if (data && data.detections) {
          const predictions = data.detections.map((detection: any) => ({
            score: detection.confidence,
            result: detection.bbox, // [x1, y1, x2, y2]
            label_name: detection.label
          })).filter((item: any) => item.score > thresholdRaw);
          setIsLoad(false);
          // 安全检查：确保data.all存在且有元素
          if (data.all && data.all.length > 0 && data.all[0]?.dataId) {
            data.updatePredicted(data.all[0].dataId.toString(), true);
          }
          setInteractorData({
            active: true,
            mousePoints: interactorData.mousePoints,
            predictData: predictions,
          });
          // 推理成功后，设置标志以触发标注创建
          console.log('推理成功，设置flags为true，预测数据:', predictions);
          setflags(true);
        } else {
          throw new Error('Invalid response format');
        }
      })
      .catch((error: any) => {
        console.error('Inference error:', error);
        message.error(`推理失败: ${error.message}`);
        model.setLoading(false);
      });
    } else {
      // 回退到原来的ModelApi方式（用于预设服务）
      const line = model.predict('PicoDet', {
        format: 'b64',
        img: imgBase64,
      });
      if (!line) return;
      // 判断接口是否在线 不在线setloading true
      const settings = project.curr?.otherSettings ? project.curr.otherSettings : {};
      if (settings?.modelName) {
        model.load(settings.modelName).then(
          () => {
            // message.info(intl('modelLoaded'));
            line.then(
              (res: any) => {
                if (res) {
                  const predictions = res.predictions.map((item: any) => {
                    if (item.score > thresholdRaw) {
                      return item;
                    }
                  });
                  setIsLoad(false);
                  if (data.all[0]?.dataId) {
                    data.updatePredicted(data.all[0].dataId.toString(), true);
                  }
                  setInteractorData({
                    active: true,
                    mousePoints: interactorData.mousePoints,
                    predictData: predictions,
                  });
                }
              },
              (error: any) => {
                message.error(`推理错误: ${error}`);
                model.setLoading(false);
              },
            );
          },
          () => {
            model.setLoading(false);
            if (!isLoading) {
              setIsLoading(true);
            }
          },
        );
      }
    }
  };
  const createLabels = (labels: any) => {
    // debugger;
    const newlabels = [...labels].map((item) => {
      const addlabel = {
        name: item,
        projectId: project.curr.projectId,
      };
      return addlabel;
    });
    if (newlabels.length > 0) {
      label.create(newlabels).then((newLabel: any) => {
        // debugger;
        setCurrentAnnotation(undefined);
        if (Array.isArray(newLabel)) {
          label.setCurr(newLabel[0]);
        } else {
          label.setCurr(newLabel);
        }

        setflags(true);
      });
    }
  };
  // useEffect(() => {
  //   annHistory.init({});
  // }, []);
  useUpdateEffect(() => {
    if (data.all.length > 0) {
      // debugger;
      // data.updatePredicted(data.all[0].dataId);
      if (data.all[0].predicted) {
        const flag = false;
        if (flag !== isLoad) {
          setIsLoad(flag);
        }
      } else {
        const flag = true;
        if (flag !== isLoad) {
          setIsLoad(flag);
        }
      }
    }
  }, [data.all]);
  useEffect(() => {
    if (!isClick) {
      onFinishEdit();
    }
  }, [isClick]);

  useUpdateEffect(() => {
    if (isLoad && project.curr?.otherSettings?.labelMapping && isLoading) {
      if (model.loading) {
        message.error(tbIntl('modelLoading'));
        return;
      }
      const settings = project.curr?.otherSettings || {};
      if (settings.mlBackendUrl) model.setMlBackendUrl(settings.mlBackendUrl);
      model.setLoading(true);
      if (settings.modelName) {
        model.load(settings.modelName).then(
          (res: any) => {
            console.log('ress', res);
            model.setLoading(false);
            if (isLoading) setIsLoading(false);
          },
          () => {
            model.setLoading(false);
            if (!isLoading) setIsLoading(true);
          },
        );
      }
    } else {
      setotherSetting(project.curr?.otherSettings ?? undefined);
    }
  }, [isLoad, project.curr?.otherSettings]);
  useUpdateEffect(() => {
    const predictflag = !isLoading && image && isLoad;
    // debugger;
    if (predictflag) {
      onPredicted(image);
    }
  }, [isLoading, isLoad, image]);
  useUpdateEffect(() => {
    // console.log('interactorData.predictData', otherSetting, interactorData.predictData.length);
    if (interactorData.predictData.length && otherSetting?.labelMapping && label.all) {
      const labels = new Set();
      const oldLabel = new Map();
      // const labelmaps: any = {};
      for (const labelItem of label.all) {
        if (labelItem.name) {
          oldLabel.set(labelItem.name, labelItem);
        }
      }
      if (otherSetting?.labelMapping?.length > 0) {
        for (const labelMap of otherSetting?.labelMapping) {
          // labelmaps[labelMap.model] = labelMap.project;
          if (!oldLabel.has(labelMap.project)) {
            labels.add(labelMap.project);
          }
        }
      } else {
        for (const labelItem of interactorData.predictData) {
          if (labelItem && !oldLabel.has(labelItem?.label_name)) {
            labels.add(labelItem?.label_name);
          }
        }
        if ([...labels].length) {
          createLabels(labels);
        }
      }
      if (![...labels].length) {
        setflags(true);
      }
    }
  }, [interactorData, otherSetting]);
  useUpdateEffect(() => {
    console.log('useUpdateEffect triggered:', {
      predictDataLength: interactorData.predictData.length,
      projectId: project.curr?.projectId,
      flags: flags
    });
    if (
      interactorData.predictData.length &&
      project.curr?.projectId !== undefined &&
      flags
    ) {
      console.log('条件满足，开始创建标注');
      const labels = new Map();
      label.getAll(project.curr.projectId).then((labelAll) => {
        // debugger;
        for (const labelItem of labelAll) {
          labels.set(labelItem.name, labelItem);
        }
        const annos: any[] = [];
        const labelMapping = new Map();
        // eslint-disable-next-line @typescript-eslint/no-shadow
        let frontendId = annotation.all?.length ? getMaxFrontendId(annotation.all) + 1 : 1;
        if (otherSetting?.labelMapping?.length > 0) {
          for (const labelMaps of otherSetting.labelMapping) {
            labelMapping.set(labelMaps.model, labelMaps.project);
          }
        }

        interactorData.predictData.map((item: any) => {
          if (item) {
            let name = '';
            if (labelMapping.has(item.label_name)) {
              name = labelMapping.get(item.label_name);
            } else {
              name = item.label_name;
            }
            let labelitem = labels.get(name);
            if (!labelitem) {
              console.warn(`标签 "${name}" 不存在，跳过此预测结果`);
              return; // 跳过这个预测结果
            }
            const result = Array.isArray(item.result) ? item.result.join(',') : item.result;
            const predictedBy = otherSetting?.modelName || 'custom-ml-backend';
            // debugger;
            // saveInteractorData(labelitem, item.result);
            if (interactorData.active) {
              // debugger;
              const anno = ectInteractorToAnnotation(
                frontendId,
                result,
                data.curr?.dataId,
                labelitem,
                predictedBy,
                'rectangle',
              );
              anno.type = 'rectangle';
              if (anno) {
                annos.push(anno);
                frontendId++;
              }
            }
          }
        });
  const deduplicate = true;
  console.log('准备创建标注:', annos);
  annotation.create(annos, '', true).then(() => {
          console.log('标注创建成功');
          message.success(`成功保存 ${annos.length} 个推理结果`);
          setInteractorData({ active: false, predictData: [], mousePoints: [] });
          setflags(false);
        }).catch((error) => {
          console.error('保存推理结果失败:', error);
          message.error('保存推理结果失败');
          setInteractorData({ active: false, predictData: [], mousePoints: [] });
          setflags(false);
        });
      });
    }
  }, [project?.curr?.projectId, interactorData.predictData, otherSetting, flags]);
  // const scaleChange = (curr,index)=>{
  //   scale.change(curr);
  //   scale.setScales
  // }
  const onG = () => {
    if (!task.nextTask()) {
      return;
    }
    // scale.setCurr(1);
    setInteractorData({ active: false, predictData: [], mousePoints: [] });
    setCurrentAnnotation(undefined);
    setflags(false);
    page?.current?.setDragEndPos({
      x: 0,
      y: 0,
    });
  };
  const onF = () => {
    if (!task.prevTask()) {
      return;
    }
    // scale.setCurr(1);
    setInteractorData({ active: false, predictData: [], mousePoints: [] });
    setCurrentAnnotation(undefined);
    setflags(false);
    page?.current?.setDragEndPos({
      x: 0,
      y: 0,
    });
  };
  const onD = () => {
    const anno = annotation.curr;
    annotation.setAll(annotation.all.filter((x) => x.frontendId != anno.frontendId));
    setCurrentAnnotation(undefined);
    annotation.remove(anno);
  };
  const onB = () => {
    annHistory.backward().then((res) => {
      if (res) {
        annotation.setAll(res.annos);
        setCurrentAnnotation(res.currAnno);
        annotation.pushToBackend(data.curr?.dataId, res.annos);
      }
    });
  };
  const onCtrlS = () => {
    annotation.pushToBackend(data.curr?.dataId);
  };

  const onShiftCtrlC = () => {
    console.log('onShiftCtrlC');
  };
  const handleWheel = (event) => {
    const deta = event.deltaY;
    if (deta > 0) {
      scale.change(-0.1);
    }
    if (deta < 0) {
      scale.change(0.1);
    }
  };
  const onHideLabel = (change: boolean, id: number) => {
    if (change) {
      setHideLabel([...hideLabel, id]);
    } else {
      const ids: number[] = hideLabel?.map((item: number) => {
        if (item !== id) {
          return item;
        }
      });
      setHideLabel(ids);
    }
  };
  return (
    <PPLabelPageContainer className={styles.det}>
      <PPToolBar>
        <PPToolBarButton
          imgSrc="./pics/buttons/rectangle.png"
          active={tool.curr == 'rectangle'}
          onClick={() => {
            if (!label.curr) {
              message.error(tbIntl('chooseCategoryFirst'));
              return;
            }
            tool.setCurr('rectangle');
            setPreTools('rectangle');
            setCurrentAnnotation(undefined);
          }}
        >
          {tbIntl('rectangle')}
        </PPToolBarButton>
        {/* <PPToolBarButton
          active={tool.curr == 'editor'}
          imgSrc="./pics/buttons/edit.png"
          onClick={() => {
            tool.setCurr('editor');
            setPreTools('editor');
          }}
        >
          {tbIntl('edit')}
        </PPToolBarButton> */}
        <PPToolBarButton
          imgSrc="./pics/buttons/zoom_in.png"
          onClick={() => {
            scale.change(0.1);
          }}
        >
          {tbIntl('zoomIn')}
        </PPToolBarButton>
        <PPToolBarButton
          imgSrc="./pics/buttons/zoom_out.png"
          onClick={() => {
            scale.change(-0.1);
          }}
        >
          {tbIntl('zoomOut')}
        </PPToolBarButton>
        <PPToolBarButton
          imgSrc="./pics/buttons/save.png"
          onClick={() => {
            annotation.pushToBackend(data.curr?.dataId);
          }}
        >
          {tbIntl('save')}
        </PPToolBarButton>
        <PPToolBarButton
          imgSrc="./pics/buttons/move.png"
          active={tool.curr == 'mover'}
          onClick={() => {
            tool.setCurr('mover');
            setPreTools('mover');
          }}
        >
          {tbIntl('move')}
        </PPToolBarButton>
        <PPToolBarButton
          imgSrc="./pics/buttons/prev.png"
          onClick={() => {
            annHistory.backward().then((res) => {
              if (res) {
                annotation.setAll(res.annos);
                setCurrentAnnotation(res.currAnno);
                annotation.pushToBackend(data.curr?.dataId, res.annos);
              }
            });
          }}
        >
          {tbIntl('unDo')}
        </PPToolBarButton>
        <PPToolBarButton
          imgSrc="./pics/buttons/next.png"
          onClick={() => {
            annHistory.forward().then((res) => {
              if (res) {
                annotation.pushToBackend(data.curr?.dataId, res.annos);
                setCurrentAnnotation(res.currAnno);
              }
            });
          }}
        >
          {tbIntl('reDo')}
        </PPToolBarButton>
        <PPToolBarButton
          imgSrc="./pics/buttons/clear_mark.png"
          onClick={() => {
            annotation.clear();
            annHistory.record({ annos: [] });
            tool.setCurr(undefined);
            setPreTools('');
            label.setCurr(undefined);
          }}
        >
          {tbIntl('clearMark')}
        </PPToolBarButton>
      </PPToolBar>
      <div id="dr" className="mainStage" onWheel={handleWheel}>
        <Spin tip="loading" spinning={!!loading.curr}>
          <Keyevent
            className="TopSide"
            events={{
              onG,
              onF,
              onD,
              onB,
              onCtrlS,
              onShiftCtrlC,
            }}
            needFocusing
          >
            <div className="draw">
              <PPStage
                ref={page}
                taskIndex={task.currIdx}
                scale={scale.curr}
                scaleChange={scale.setScale}
                annotations={annotation.all}
                currentTool={tool.curr}
                currentAnnotation={annotation.curr}
                setCurrentAnnotation={setCurrentAnnotation}
                onAnnotationModify={onAnnotationModify}
                onAnnotationModifyComplete={() => {}}
                frontendIdOps={{ frontendId: frontendId, setFrontendId: setFrontendId }}
                imgSrc={data.imgSrc}
                transparency={100}
                onAnnotationAdd={(anno) => {
                  const newAnnos = annotation.all.concat([anno]);
                  annotation.setAll(newAnnos);
                }}
                drawTool={drawTool}
                hideLabel={hideLabel}
                threshold={0}
                // OnSelect={setOnSelect}
                onAnnotationModifyUP={onAnnotationModifyUP}
                ChanegeTool={(tools: any) => {
                  tool.setCurr(tools);
                }}
              />
            </div>
          </Keyevent>
          <div
            className="pblock"
            style={{
              display: 'flex',
            }}
          >
            <div
              className="preButton"
              style={{
                background: 'blue',
                color: 'white',
                width: '100px',
                textAlign: 'center',
                lineHeight: '2.55rem',
              }}
              onClick={() => {
                if (!task.prevTask()) {
                  return;
                }
                // scale.setCurr(1);
                setInteractorData({ active: false, predictData: [], mousePoints: [] });
                setCurrentAnnotation(undefined);
                setflags(false);
                page?.current?.setDragEndPos({
                  x: 0,
                  y: 0,
                });
              }}
            >
              {tbIntl('prevTask')}
            </div>
            <PPProgress task={task} project={project} />
            <div
              className="nextButton"
              style={{
                background: 'blue',
                color: 'white',
                width: '100px',
                textAlign: 'center',
                lineHeight: '2.55rem',
              }}
              onClick={() => {
                if (!task.nextTask()) {
                  return;
                }
                // scale.setCurr(1);
                // debugger;

                setInteractorData({ active: false, predictData: [], mousePoints: [] });
                setCurrentAnnotation(undefined);
                setflags(false);
                page?.current?.setDragEndPos({
                  x: 0,
                  y: 0,
                });
              }}
            >
              {tbIntl('nextTask')}
            </div>
          </div>
          {/* <div
            className="prevTask"
            data-test-id="prevTask"
            onClick={() => {
              if (!task.prevTask()) {
                return;
              }
              // scale.setCurr(1);
              setInteractorData({ active: false, predictData: [], mousePoints: [] });
              setCurrentAnnotation(undefined);
              setflags(false);
              page?.current?.setDragEndPos({
                x: 0,
                y: 0,
              });
            }}
          />
          <div
            className="nextTask"
            data-test-id="nextTask"
            onClick={() => {
              if (!task.nextTask()) {
                return;
              }
              // scale.setCurr(1);
              setInteractorData({ active: false, predictData: [], mousePoints: [] });
              setCurrentAnnotation(undefined);
              setflags(false);
              page?.current?.setDragEndPos({
                x: 0,
                y: 0,
              });
            }}
          /> */}
        </Spin>
      </div>
      <PPToolBar disLoc="right">
        <InferenceConfig
          inferenceEnabled={inferenceEnabled}
          setInferenceEnabled={setInferenceEnabled}
          selectedService={selectedService}
          setSelectedService={setSelectedService}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          mlBackendUrl={mlBackendUrl}
          setMlBackendUrl={setMlBackendUrl}
          threshold={threshold}
          setThreshold={setThreshold}
          uploadedModelFile={uploadedModelFile}
          setUploadedModelFile={setUploadedModelFile}
          showInferConfig={showInferConfig}
          setShowInferConfig={setShowInferConfig}
        />
        <PPToolBarButton
          imgSrc="./pics/buttons/export.png"
          disabled={
            !inferenceEnabled || 
            !selectedService || 
            (selectedService === 'custom' && !mlBackendUrl)
          }
          onClick={async () => {
            if (selectedService === 'custom' && mlBackendUrl) {
              try {
                const response = await fetch(`${mlBackendUrl}/labels`);
                if (response.ok) {
                  const data = await response.json();
                  if (data.labels && Array.isArray(data.labels)) {
                    createLabels(data.labels);
                    message.success(`成功导入 ${data.labels.length} 个标签`);
                  } else {
                    message.error('获取标签失败：响应格式错误');
                  }
                } else {
                  message.error('获取标签失败：网络请求错误');
                }
              } catch (error) {
                message.error(`获取标签失败：${error.message}`);
              }
            } else {
              message.error('请先配置有效的自定义服务');
            }
          }}
        >
          导入标签
        </PPToolBarButton>
        <PPToolBarButton
          imgSrc="./pics/buttons/save.png"
          disabled={
            !inferenceEnabled || 
            !selectedService || 
            (selectedService === 'custom' && !mlBackendUrl)
          }
          onClick={async () => {
            if (selectedService === 'custom' && mlBackendUrl) {
              try {
                const response = await fetch(`${mlBackendUrl}/load`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model_path: 'Source/model.pdmodel', // 使用PaddlePaddle模型文件
                    labels_path: 'Source/infer_cfg.yml' // 可选的标签文件
                  })
                });
                if (response.ok) {
                  message.success('模型加载成功');
                } else {
                  try {
                    const errorData = await response.json();
                    message.error(`模型加载失败：${errorData.detail || '未知错误'}`);
                  } catch {
                    message.error('模型加载失败：网络错误');
                  }
                }
              } catch (error: any) {
                message.error(`模型加载失败：${error.message || '网络错误'}`);
              }
            } else {
              message.error('请先配置有效的自定义服务');
            }
          }}
        >
          加载模型
        </PPToolBarButton>
        <PPToolBarButton
          imgSrc="./pics/buttons/clear_mark.png"
          disabled={
            !inferenceEnabled || 
            !selectedService || 
            (selectedService === 'custom' && !mlBackendUrl)
          }
          onClick={async () => {
            if (selectedService === 'custom' && mlBackendUrl) {
              try {
                const response = await fetch(`${mlBackendUrl}/unload`, {
                  method: 'POST'
                });
                if (response.ok) {
                  message.success('模型卸载成功');
                } else {
                  try {
                    const errorData = await response.json();
                    message.error(`模型卸载失败：${errorData.detail || '未知错误'}`);
                  } catch {
                    message.error('模型卸载失败：网络错误');
                  }
                }
              } catch (error: any) {
                message.error(`模型卸载失败：${error.message || '网络错误'}`);
              }
            } else {
              message.error('请先配置有效的自定义服务');
            }
          }}
        >
          卸载模型
        </PPToolBarButton>
        <PPToolBarButton
          imgSrc="./pics/buttons/intelligent_interaction.png"
          disabled={
            !inferenceEnabled || 
            !selectedService || 
            (selectedService === 'custom' && !mlBackendUrl) ||
            (selectedService === 'preset' && (!selectedModel || !uploadedModelFile))
          }
          onClick={() => {
            if (inferenceEnabled && selectedService && image) {
              if (selectedService === 'custom' && mlBackendUrl) {
                model.setMlBackendUrl(mlBackendUrl);
                onPredicted(image);
              } else if (selectedService === 'preset' && selectedModel && uploadedModelFile) {
                // 这里处理预设模型服务的推理逻辑
                message.info(`使用预设模型 ${selectedModel} 进行推理`);
                // TODO: 实现预设模型推理逻辑
              }
            }
          }}
        >
          执行推理
        </PPToolBarButton>
        {/* 推理全部按钮 */}
        <PPToolBarButton
          imgSrc="./pics/buttons/intelligent_interaction.png"
          disabled={
            !inferenceEnabled || 
            !selectedService || 
            (selectedService === 'custom' && !mlBackendUrl) ||
            (selectedService === 'preset' && (!selectedModel || !uploadedModelFile))
          }
          onClick={() => {
            if (inferenceEnabled && selectedService) {
              if (selectedService === 'custom' && mlBackendUrl) {
                model.setMlBackendUrl(mlBackendUrl);
                message.info('推理全部功能待实现');
              } else if (selectedService === 'preset' && selectedModel && uploadedModelFile) {
                message.info(`使用预设模型 ${selectedModel} 推理全部功能待实现`);
              }
            }
          }}
        >
          推理全部
        </PPToolBarButton>
        <PPToolBarButton
          imgSrc="./pics/buttons/data_division.png"
          onClick={() => {
            history.push(`/project_overview?projectId=${project.curr.projectId}`);
          }}
        >
          {tbIntl('projectOverview')}
        </PPToolBarButton>
        {/* <PPToolBarButton
          imgSrc="./pics/buttons/data_division.png"
          onClick={() => {
            history.push(`/ml?projectId=${project.curr.projectId}`);
          }}
        >
          {'ML Settings'}
        </PPToolBarButton> */}
        {/* <PPAIButton
          imgSrc="./pics/buttons/intelligent_interaction.png"
          active={interactorData.active}
          onClick={async () => {
            
          }}
          model={model}
          project={project}
        >
        {tbIntl('interactor')}
        </PPAIButton> */}
      </PPToolBar>
      <div className="rightSideBar">
        <PPLabelList
          labels={label.all}
          activeIds={label.activeIds}
          onLabelSelect={label.onSelect}
          onLabelDelete={label.remove}
          // disabled={otherSetting?.labelMapping?.length > 0}
          disabled={false}
          onLabelAdd={(lab) => {
            label.create({ ...lab, projectId: project.curr.projectId }).then((newLabel) => {
              setCurrentAnnotation(undefined);
              label.setCurr(newLabel);
            });
          }}
          onHideLabel={onHideLabel}
        />
        <PPAnnotationList
          disabled={false}
          type={'Detection'}
          currAnnotation={annotation.curr}
          annotations={annotation.all}
          onAnnotationSelect={(selectedAnno) => {
            if (!selectedAnno?.delete) setCurrentAnnotation(selectedAnno);
            setAnnotation(selectedAnno);
            // console.log('selectedAnno', selectedAnno);
          }}
          onAnnotationAdd={() => {
            console.log('onAnnotationAdd');
            setCurrentAnnotation(undefined);
          }}
          onAnnotationModify={() => {}}
          onAnnotationDelete={(anno: Annotation) => {
            annotation.setAll(annotation.all.filter((x) => x.frontendId != anno.frontendId));
            setCurrentAnnotation(undefined);
            annotation.remove(anno);
          }}
        />
      </div>
    </PPLabelPageContainer>
  );
};

export default Page;
