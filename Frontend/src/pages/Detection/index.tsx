import TaskNavigator from './components/TaskNavigator';
import InferenceActions from './components/InferenceActions';
import { useEffect, useState, useRef } from 'react';
import { useUpdateEffect } from 'ahooks';
import { Spin, message } from 'antd';
import BatchInferenceModal from './components/BatchInferenceModal';
import { history, useModel } from 'umi';
import styles from './index.less';
import PPLabelPageContainer from '@/components/PPLabelPage/PPLabelPageContainer';
import LeftBar from './components/LeftBar';
import PPToolBar from '@/components/PPLabelPage/PPToolBar';
import PPToolBarButton from '@/components/PPLabelPage/PPToolBarButton';
import RightBar from './components/RightBar';
import type { pageRef } from '@/components/PPLabelPage/PPStage';
import PPStage from '@/components/PPLabelPage/PPStage';
import useImage from 'use-image';
import { DataApi, TaskApi, ProjectApi } from '@/services/web/apis';
// import type { Label } from '@/models/';
import PPAnnotationList from '@/components/PPLabelPage/PPAnnotationList';
import { PageInit, ModelUtils } from '@/services/utils';
import type { Annotation } from '@/models/Annotation';
import PPRectangle from '@/components/PPDrawTool/PPRectangle';
import PPProgress from '@/components/PPLabelPage/PPProgress';
import { IntlInitJsx } from '@/components/PPIntl';
import PPSetButton from '@/components/PPLabelPage/PPButtonSet';
import Keyevent from 'react-keyevent';
import InferenceConfigPanel from './components/InferenceConfigPanel';
import { ectInteractorToAnnotation } from '@/components/PPDrawTool/PPInteractor';
import serviceUtils from '@/services/serviceUtils';
const port = window.location.port == '8000' ? '17995' : window.location.port;
const baseUrl = `http://${window.location.hostname}:${port}`;
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
  const [batchInferenceVisible, setBatchInferenceVisible] = useState(false);
  const [batchInferenceProgress, setBatchInferenceProgress] = useState(0);
  const [batchInferenceTotal, setBatchInferenceTotal] = useState(0);
  const [batchInferenceCurrent, setBatchInferenceCurrent] = useState('');
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
    
    // 如果图片已经是 base64 格式，直接返回
    if (img.src && img.src.startsWith('data:image/')) {
      return img.src.replace(/^data:image\/(png|jpg);base64,/, '');
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0, img.width, img.height);
    const dataURL = canvas.toDataURL('image/png');

    return dataURL.replace(/^data:image\/(png|jpg);base64,/, '');
  };

  // 通过后端API获取图片的base64
  const fetchImageAsBase64 = async (dataId: number): Promise<string> => {
    if (!dataId) {
      throw new Error(`Invalid dataId: ${dataId}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/datas/${dataId}/image`);
      if (!response.ok) {
        throw new Error(`获取图片失败: ${response.status}`);
      }
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // 移除 data:image/...;base64, 前缀
          const base64 = result.replace(/^data:image\/[a-z]+;base64,/, '');
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('获取图片base64失败:', error);
      throw error;
    }
  };

  // 获取所有图片数据（仅用现有API，不依赖后端批量接口）
  /**
   * 获取所有图片数据（仅用现有API，不依赖后端批量接口）
   * @param projectId 项目ID
   */
  async function getAllDatasByProjectId(projectId: string): Promise<any[]> {
    let allDatas: any[] = [];

    // 使用配置的后端URL
    const backendUrl = baseUrl.replace(/\/$/, ''); // 移除末尾的斜杠
    console.log(`[getAllDatasByProjectId] 使用后端URL: ${backendUrl}`);

    try {
      // 直接使用fetch调用后端API，避免ProjectApi的配置问题
      console.log(`[getAllDatasByProjectId] 请求后端: ${backendUrl}/api/projects/${projectId}/tasks`);
      const response = await fetch(`${backendUrl}/api/projects/${projectId}/tasks`);
      if (!response.ok) {
        throw new Error(`获取任务失败: ${response.status}`);
      }
      const tasks = await response.json();
      console.log('[getAllDatasByProjectId] 获取到任务:', tasks);
      console.log('[getAllDatasByProjectId] 任务数量:', tasks.length);

      // 遍历每个任务，获取其数据
      for (const taskItem of tasks) {
        console.log('[getAllDatasByProjectId] 处理任务:', taskItem);
        const realTaskId = taskItem.task_id;
        if (realTaskId) {
          try {
            console.log(`[getAllDatasByProjectId] 获取任务 ${realTaskId} 的数据`);
            const datasResponse = await fetch(`${backendUrl}/api/tasks/${realTaskId}/datas`);
            if (!datasResponse.ok) {
              console.error(`获取任务 ${realTaskId} 数据失败: ${datasResponse.status}`);
              continue;
            }
            const datas = await datasResponse.json();
            console.log(`[getAllDatasByProjectId] 任务${realTaskId}数据:`, datas);
            console.log(`[getAllDatasByProjectId] 任务${realTaskId}数据数量:`, datas.length);
            allDatas.push(...datas);
          } catch (error) {
            console.error(`[getAllDatasByProjectId] 获取任务${realTaskId}数据失败:`, error);
          }
        } else {
          console.warn('[getAllDatasByProjectId] 任务缺少 task_id 字段:', taskItem);
        }
      }
    } catch (error) {
      console.error('[getAllDatasByProjectId] 获取任务失败:', error);
      return [];
    }
    console.log(`[getAllDatasByProjectId] 总共获取到 ${allDatas.length} 个数据`);
    return allDatas;
  }

  const runBatchInference = async () => {
    if (!inferenceEnabled || !selectedService) {
      message.error('请先配置推理服务');
      return;
    }

    // 获取项目ID
    const projectIdStr = serviceUtils.getQueryVariable('projectId');
    if (!projectIdStr) {
      message.error('无法获取项目ID');
      return;
    }
    const projectId = parseInt(projectIdStr, 10);
    if (isNaN(projectId)) {
      message.error('项目ID无效');
      return;
    }

    try {
      // 获取所有数据
      const allDatas = await getAllDatasByProjectId(projectId.toString());
      if (allDatas.length === 0) {
        message.error('项目中没有数据');
        return;
      }

      setBatchInferenceTotal(allDatas.length);
      setBatchInferenceProgress(0);
      setBatchInferenceVisible(true);

      // 逐一处理每个数据
      for (let i = 0; i < allDatas.length; i++) {
        const dataItem = allDatas[i];
        if (!dataItem.data_id) {
          console.error('dataItem.data_id is undefined', dataItem);
          continue;
        }
        setBatchInferenceCurrent(dataItem.path || `数据 ${i + 1}`);
        try {
          // 获取图片base64
          const imgBase64 = await fetchImageAsBase64(dataItem.data_id);
          // 进行推理
          await performInference(imgBase64, dataItem.data_id);
          setBatchInferenceProgress(i + 1);
        } catch (error) {
          console.error(`推理数据 ${dataItem.data_id} 失败:`, error);
          // 继续处理下一个数据
        }
      }

      message.success('批量推理完成');
    } catch (error) {
      console.error('批量推理失败:', error);
      message.error('批量推理失败');
    } finally {
      setBatchInferenceVisible(false);
    }
  };

  // 执行推理的辅助函数
  const performInference = async (imgBase64: string, dataId: number) => {
    return new Promise<void>((resolve, reject) => {
      const thresholdRaw = threshold ? threshold : 0.5;
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
        .then(async (data: any) => {
          if (data && data.detections) {
            const predictions = data.detections.map((detection: any) => ({
              score: detection.confidence,
              result: detection.bbox, // [x1, y1, x2, y2]
              label_name: detection.label
            })).filter((item: any) => item.score > thresholdRaw);
            // 创建标注
            if (predictions.length > 0) {
              await createBatchAnnotations(dataId, predictions);
            }
            resolve();
          } else {
            throw new Error('Invalid response format');
          }
        })
        .catch(reject);
      } else {
        // 预设服务的情况 - 这里需要根据实际API调整
        reject(new Error('预设服务批量推理暂未实现'));
      }
    });
  };
  const onPredicted = (imgBase64: string) => {
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
          setIsLoading(false);
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
                  setIsLoading(false);
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
  const createBatchAnnotations = async (dataId: number, predictions: any[]) => {
    // 从URL参数获取项目ID
    const projectIdStr = serviceUtils.getQueryVariable('projectId');
    if (!projectIdStr) return;
    const projectId = parseInt(projectIdStr, 10);
    if (isNaN(projectId)) return;
    
    // 获取项目标签
    const labels = new Map();
    const labelAll = await label.getAll(projectId);
    for (const labelItem of labelAll) {
      labels.set(labelItem.name, labelItem);
    }

    const annos: any[] = [];
    const labelMapping = new Map();
    let frontendId = annotation.all?.length ? getMaxFrontendId(annotation.all) + 1 : 1;

    if (otherSetting?.labelMapping?.length > 0) {
      for (const labelMaps of otherSetting.labelMapping) {
        labelMapping.set(labelMaps.model, labelMaps.project);
      }
    }

    predictions.map((item: any) => {
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

        // 创建标注对象
        const anno = {
          frontendId: frontendId,
          result: result,
          dataId: dataId,
          labelId: labelitem.labelId,
          label: labelitem,
          predictedBy: predictedBy,
          type: 'rectangle',
          annotationId: undefined,
        };
        annos.push(anno);
        frontendId++;
      }
    });

    if (annos.length > 0) {
      // 使用 annotation API 创建标注
      await annotation.create(annos, '', true);
      console.log(`为数据 ${dataId} 创建了 ${annos.length} 个标注`);
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
        if (flag !== isLoading) {
          setIsLoading(flag);
        }
      } else {
        const flag = true;
        if (flag !== isLoading) {
          setIsLoading(flag);
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
    if (isLoading && project.curr?.otherSettings?.labelMapping && isLoading) {
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
  }, [isLoading, project.curr?.otherSettings]);
  useUpdateEffect(() => {
    const predictflag = !isLoading && image && isLoading;
    // debugger;
    if (predictflag) {
      onPredicted(getBase64Image(image));
    }
  }, [isLoading, isLoading, image]);
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
    // 从URL获取项目ID
    const projectIdStr = serviceUtils.getQueryVariable('projectId');
    const projectId = projectIdStr ? parseInt(projectIdStr, 10) : undefined;
    
    console.log('useUpdateEffect triggered:', {
      predictDataLength: interactorData.predictData.length,
      projectId: projectId,
      flags: flags
    });
    if (
      interactorData.predictData.length &&
      projectId !== undefined &&
      flags
    ) {
      console.log('条件满足，开始创建标注');
      const labels = new Map();
      label.getAll(projectId).then((labelAll) => {
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
              if (anno) {
                anno.type = 'rectangle';
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
  }, [interactorData.predictData, otherSetting, flags]);
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
      <BatchInferenceModal
        visible={batchInferenceVisible}
        progress={batchInferenceProgress}
        total={batchInferenceTotal}
        current={batchInferenceCurrent}
      />
      <LeftBar
        tool={tool}
        scale={scale}
        annotation={annotation}
        data={data}
        label={label}
        annHistory={annHistory}
        tbIntl={tbIntl}
        setCurrentAnnotation={setCurrentAnnotation}
        setPreTools={setPreTools}
        setInteractorData={setInteractorData}
        setflags={setflags}
        serviceUtils={serviceUtils}
        project={project}
        onClearAllAnnotations={async () => {
          // 从URL参数获取项目ID
          const projectIdStr = serviceUtils.getQueryVariable('projectId');
          if (!projectIdStr) {
            message.error('无法获取项目ID，请确保URL中包含projectId参数');
            return;
          }
          const projectId = parseInt(projectIdStr, 10);
          if (isNaN(projectId)) {
            message.error('项目ID无效');
            return;
          }
          try {
            const dataApi = new DataApi();
            const projectApi = new ProjectApi();
            // 获取项目的所有任务
            const tasks = await projectApi.getTasks(projectId.toString());
            let totalDeleted = 0;
            for (const task of tasks) {
              if (task.taskId) {
                // 获取任务的所有数据
                const datas = await new TaskApi().getDatas(task.taskId);
                for (const dataItem of datas) {
                  if (dataItem.dataId) {
                    try {
                      await dataApi.deleteAnnotations(dataItem.dataId.toString());
                      totalDeleted++;
                    } catch (error) {
                      console.error(`删除数据 ${dataItem.dataId} 标注失败:`, error);
                    }
                  }
                }
              }
            }
            message.success(`成功清空 ${totalDeleted} 个数据的标注`);
            // 刷新当前数据
            if (data.curr?.dataId) {
              annotation.getAll(data.curr.dataId);
            }
          } catch (error) {
            console.error('清空全部标注失败:', error);
            message.error('清空全部标注失败');
          }
        }}
      />
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
          <TaskNavigator
            task={task}
            project={project}
            tbIntl={tbIntl}
            onPrev={() => {
              if (!task.prevTask()) return;
              setInteractorData({ active: false, predictData: [], mousePoints: [] });
              setCurrentAnnotation(undefined);
              setflags(false);
              page?.current?.setDragEndPos({ x: 0, y: 0 });
            }}
            onNext={() => {
              if (!task.nextTask()) return;
              setInteractorData({ active: false, predictData: [], mousePoints: [] });
              setCurrentAnnotation(undefined);
              setflags(false);
              page?.current?.setDragEndPos({ x: 0, y: 0 });
            }}
          />
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
        <InferenceConfigPanel
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
        <InferenceActions
          inferenceEnabled={inferenceEnabled}
          selectedService={selectedService}
          mlBackendUrl={mlBackendUrl}
          selectedModel={selectedModel}
          uploadedModelFile={uploadedModelFile}
          onImportLabels={async () => {
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
          onLoadModel={async () => {
            if (selectedService === 'custom' && mlBackendUrl) {
              try {
                const response = await fetch(`${mlBackendUrl}/load`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model_path: 'Source/model.pdmodel',
                    labels_path: 'Source/infer_cfg.yml'
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
          onUnloadModel={async () => {
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
          onRunInference={() => {
            if (inferenceEnabled && selectedService && image) {
              if (selectedService === 'custom' && mlBackendUrl) {
                model.setMlBackendUrl(mlBackendUrl);
                onPredicted(getBase64Image(image));
              } else if (selectedService === 'preset' && selectedModel && uploadedModelFile) {
                onPredicted(getBase64Image(image));
              }
            }
          }}
          onRunBatchInference={async () => {
            if (inferenceEnabled && selectedService) {
              if (selectedService === 'custom' && mlBackendUrl) {
                model.setMlBackendUrl(mlBackendUrl);
                runBatchInference();
              } else if (selectedService === 'preset' && selectedModel && uploadedModelFile) {
                message.info(`使用预设模型 ${selectedModel} 推理全部功能待实现`);
              }
            }
          }}
          onProjectOverview={() => {
            const projectId = serviceUtils.getQueryVariable('projectId');
            history.push(`/project_overview?projectId=${projectId}`);
          }}
          tbIntl={tbIntl}
        />
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
        <RightBar
          label={label}
          annotation={annotation}
          setCurrentAnnotation={setCurrentAnnotation}
          onHideLabel={onHideLabel}
        />
      </div>
    </PPLabelPageContainer>
  );
};

export default Page;
