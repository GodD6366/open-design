import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  composeShopHomePageSystemPrompt,
} from '../prompts/shop-home-page';
import { getShopHomePageTonePresets } from '../prompts/shop-home-page-tones';
import { streamMessage } from '../providers/anthropic';
import { streamViaDaemon } from '../providers/daemon';
import {
  fetchDesignSystem,
  fetchProjectFiles,
  fetchSkill,
  projectFileUrl,
} from '../providers/registry';
import {
  createConversation,
  deleteConversation as deleteConversationApi,
  listConversations,
  listMessages,
  loadTabs,
  patchConversation,
  patchProject,
  saveMessage,
  saveTabs,
} from '../state/projects';
import { navigate } from '../router';
import type {
  AgentEvent,
  AgentInfo,
  AppConfig,
  ChatAttachment,
  ChatMessage,
  Conversation,
  DesignSystemSummary,
  OpenTabsState,
  Project,
  ProjectFile,
  SkillSummary,
} from '../types';
import {
  fetchShopHomePageState,
  applyShopHomePageSchema,
  enqueueShopHomePageAssets,
  fetchShopHomePageAssetTasks,
} from '../shop-home-page/api';
import { ShopHomePagePhonePreview } from '../shop-home-page/ShopHomePagePhonePreview';
import {
  SHOP_HOME_PAGE_PREVIEW_FILE,
  SHOP_HOME_PAGE_REQUIREMENTS_FILE,
  SHOP_HOME_PAGE_STYLE_GUIDE_FILE,
  SHOP_HOME_PAGE_SCHEMA_FILE,
  SHOP_HOME_PAGE_SCREEN_FILE,
} from '../shop-home-page/constants';
import type {
  AssetTask,
  ShopHomePageState,
} from '../shop-home-page/types';
import { AvatarMenu } from './AvatarMenu';
import { ChatPane } from './ChatPane';
import { FileWorkspace } from './FileWorkspace';
import { Icon } from './Icon';

type ShopHomePagePanel = 'schema' | 'logs' | 'files' | null;

const SHOP_HOME_PAGE_FILE_META = [
  {
    fileName: SHOP_HOME_PAGE_REQUIREMENTS_FILE,
    title: '需求结构',
    description: '承接左侧澄清后的业务需求与模块约束。',
  },
  {
    fileName: SHOP_HOME_PAGE_STYLE_GUIDE_FILE,
    title: '风格指南',
    description: '保存模板风格分析、参考图和生成规则。',
  },
  {
    fileName: SHOP_HOME_PAGE_SCHEMA_FILE,
    title: '页面结构',
    description: '店铺首页唯一事实源，右侧预览基于它实时渲染。',
  },
  {
    fileName: SHOP_HOME_PAGE_SCREEN_FILE,
    title: '调试屏幕页',
    description: '用于调试结构编译结果的完整页面文件。',
  },
  {
    fileName: SHOP_HOME_PAGE_PREVIEW_FILE,
    title: '预览页面',
    description: '结构编译后的预览文件，可单独打开检查。',
  },
] as const;

const SHOP_HOME_PAGE_TONE_LABELS: Record<string, string> = Object.fromEntries(
  getShopHomePageTonePresets().map((preset) => [
    preset.id,
    preset.label,
  ]),
);

function isTerminalAssetTask(task: AssetTask) {
  return task.status === 'done' || task.status === 'failed';
}

interface Props {
  project: Project;
  routeFileName: string | null;
  config: AppConfig;
  agents: AgentInfo[];
  skills: SkillSummary[];
  designSystems: DesignSystemSummary[];
  daemonLive: boolean;
  onModeChange: (mode: AppConfig['mode']) => void;
  onAgentChange: (id: string) => void;
  onAgentModelChange: (
    id: string,
    choice: { model?: string; reasoning?: string },
  ) => void;
  onRefreshAgents: () => void;
  onOpenSettings: () => void;
  onBack: () => void;
  onClearPendingPrompt: () => void;
  onTouchProject: () => void;
  onProjectChange: (next: Project) => void;
  onProjectsRefresh: () => void;
}

export function ShopHomePageProjectView({
  project,
  routeFileName,
  config,
  agents,
  skills,
  designSystems,
  daemonLive,
  onModeChange,
  onAgentChange,
  onAgentModelChange,
  onRefreshAgents,
  onOpenSettings,
  onBack,
  onClearPendingPrompt,
  onTouchProject,
  onProjectChange,
  onProjectsRefresh,
}: Props) {
  const [activePanel, setActivePanel] = useState<ShopHomePagePanel>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [runtimeState, setRuntimeState] = useState<ShopHomePageState | null>(null);
  const [runtimeLoading, setRuntimeLoading] = useState(true);
  const [runtimeBusy, setRuntimeBusy] = useState<string | null>(null);
  const [generateQueue, setGenerateQueue] = useState<AssetTask[]>([]);
  const [schemaEditor, setSchemaEditor] = useState('');
  const [schemaDirty, setSchemaDirty] = useState(false);
  const [openTabsState, setOpenTabsState] = useState<OpenTabsState>({
    tabs: [],
    active: null,
  });
  const [openRequest, setOpenRequest] = useState<{ name: string; nonce: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tabsLoadedRef = useRef(false);
  const handledTerminalTaskIdsRef = useRef<Set<string>>(new Set());
  const skillCache = useRef<Map<string, ReturnType<typeof fetchSkill> extends Promise<infer T> ? T : never>>(new Map());
  const designCache = useRef<Map<string, ReturnType<typeof fetchDesignSystem> extends Promise<infer T> ? T : never>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await listConversations(project.id);
      if (cancelled) return;
      if (list.length === 0) {
        const fresh = await createConversation(project.id);
        if (cancelled) return;
        if (fresh) {
          setConversations([fresh]);
          setActiveConversationId(fresh.id);
        }
      } else {
        setConversations(list);
        setActiveConversationId(list[0]!.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const list = await listMessages(project.id, activeConversationId);
      if (cancelled) return;
      setMessages(list);
      setError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id, activeConversationId]);

  const refreshProjectFiles = useCallback(async (): Promise<ProjectFile[]> => {
    const files = await fetchProjectFiles(project.id);
    setProjectFiles(files);
    return files;
  }, [project.id]);

  useEffect(() => {
    let cancelled = false;
    tabsLoadedRef.current = false;
    (async () => {
      const state = await loadTabs(project.id);
      if (cancelled) return;
      setOpenTabsState(state);
      tabsLoadedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  const persistTabsState = useCallback(
    (next: OpenTabsState) => {
      setOpenTabsState(next);
      if (tabsLoadedRef.current) {
        void saveTabs(project.id, next);
      }
    },
    [project.id],
  );

  const requestOpenFile = useCallback((name: string) => {
    if (!name) return;
    setOpenRequest({ name, nonce: Date.now() });
  }, []);

  const hydrateRuntimeState = useCallback((next: ShopHomePageState) => {
    setRuntimeState(next);
    setSchemaEditor(next.schemaText);
    setSchemaDirty(false);
    setRuntimeError(null);
  }, []);

  const refreshRuntimeState = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) setRuntimeLoading(true);
    try {
      const state = await fetchShopHomePageState(project.id);
      hydrateRuntimeState(state);
    } catch (err) {
      setRuntimeError(localizeStorefrontText(String(err instanceof Error ? err.message : err)));
    } finally {
      if (!silent) setRuntimeLoading(false);
    }
  }, [hydrateRuntimeState, project.id]);

  useEffect(() => {
    void refreshProjectFiles();
    void refreshRuntimeState();
  }, [refreshProjectFiles, refreshRuntimeState]);

  const composedSystemPrompt = useCallback(async (): Promise<string> => {
    const skill =
      project.skillId
        ? (skillCache.current.get(project.skillId) ?? await fetchSkill(project.skillId))
        : null;
    if (project.skillId && skill && !skillCache.current.has(project.skillId)) {
      skillCache.current.set(project.skillId, skill);
    }

    const designSystem =
      project.designSystemId
        ? (designCache.current.get(project.designSystemId) ?? await fetchDesignSystem(project.designSystemId))
        : null;
    if (project.designSystemId && designSystem && !designCache.current.has(project.designSystemId)) {
      designCache.current.set(project.designSystemId, designSystem);
    }

    return composeShopHomePageSystemPrompt({
      skill,
      designSystem,
      metadata: project.metadata,
    });
  }, [project.designSystemId, project.metadata, project.skillId]);

  const persistMessage = useCallback(
    (message: ChatMessage) => {
      if (!activeConversationId) return;
      void saveMessage(project.id, activeConversationId, message);
    },
    [activeConversationId, project.id],
  );

  const handleSend = useCallback(
    async (prompt: string, attachments: ChatAttachment[]) => {
      if (!activeConversationId) return;
      setError(null);
      const startedAt = Date.now();
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: prompt,
        attachments: attachments.length > 0 ? attachments : undefined,
      };
      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        events: [],
        startedAt,
      };
      const nextHistory = [...messages, userMsg];
      setMessages([...nextHistory, assistantMsg]);
      setStreaming(true);
      onTouchProject();
      persistMessage(userMsg);

      if (messages.length === 0) {
        const title = prompt.slice(0, 60).trim();
        if (title) {
          setConversations((current) =>
            current.map((conversation) =>
              conversation.id === activeConversationId
                ? { ...conversation, title }
                : conversation,
            ),
          );
          void patchConversation(project.id, activeConversationId, { title });
        }
      }

      const beforeFileNames = new Set(projectFiles.map((file) => file.name));

      const updateAssistant = (updater: (prev: ChatMessage) => ChatMessage) => {
        setMessages((current) =>
          current.map((message) => (message.id === assistantId ? updater(message) : message)),
        );
      };

      const pushEvent = (event: AgentEvent) => {
        updateAssistant((prev) => ({ ...prev, events: [...(prev.events ?? []), event] }));
      };

      const appendContent = (delta: string) => {
        updateAssistant((prev) => ({ ...prev, content: prev.content + delta }));
      };

      const controller = new AbortController();
      abortRef.current = controller;
      const systemPrompt = await composedSystemPrompt();

      const finalizeTurn = async () => {
        const nextFiles = await refreshProjectFiles();
        await refreshRuntimeState();
        setMessages((current) => {
          const producedFiles = nextFiles.filter((file) => !beforeFileNames.has(file.name));
          const updated = current.map((message) =>
            message.id === assistantId
              ? producedFiles.length > 0
                ? { ...message, producedFiles }
                : message
              : message,
          );
          const finalized = updated.find((message) => message.id === assistantId);
          if (finalized) persistMessage(finalized);
          return updated;
        });
        onProjectsRefresh();
      };

      const handlers = {
        onDelta: appendContent,
        onAgentEvent: pushEvent,
        onDone: () => {
          updateAssistant((prev) => ({ ...prev, endedAt: Date.now() }));
          setStreaming(false);
          abortRef.current = null;
          void finalizeTurn();
        },
        onError: (err: Error) => {
          setError(err.message);
          updateAssistant((prev) => ({ ...prev, endedAt: Date.now() }));
          setStreaming(false);
          abortRef.current = null;
          void finalizeTurn();
        },
      };

      if (config.mode === 'daemon') {
        if (!config.agentId) {
          handlers.onError(new Error('请先在顶部选择一个本地 Agent。'));
          return;
        }
        const choice = config.agentModels?.[config.agentId];
        void streamViaDaemon({
          agentId: config.agentId,
          history: nextHistory,
          systemPrompt,
          signal: controller.signal,
          handlers,
          projectId: project.id,
          attachments: attachments.map((attachment) => attachment.path),
          model: choice?.model ?? null,
          reasoning: choice?.reasoning ?? null,
        });
        return;
      }

      pushEvent({ kind: 'status', label: 'requesting', detail: config.model });
      void streamMessage(config, systemPrompt, nextHistory, controller.signal, {
        onDelta: (delta) => {
          handlers.onDelta(delta);
          handlers.onAgentEvent({ kind: 'text', text: delta });
        },
        onDone: handlers.onDone,
        onError: handlers.onError,
      });
    },
    [
      activeConversationId,
      composedSystemPrompt,
      config,
      messages,
      onProjectsRefresh,
      onTouchProject,
      persistMessage,
      project.id,
      projectFiles,
      refreshProjectFiles,
      refreshRuntimeState,
    ],
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setMessages((current) => {
      const next = current.map((message) =>
        message.role === 'assistant' && message.endedAt === undefined
          ? { ...message, endedAt: Date.now() }
          : message,
      );
      const finalized = next.find(
        (message) =>
          message.role === 'assistant' &&
          message.endedAt !== undefined &&
          !current.find((prev) => prev.id === message.id && prev.endedAt !== undefined),
      );
      if (finalized) persistMessage(finalized);
      return next;
    });
  }, [persistMessage]);

  const handleNewConversation = useCallback(async () => {
    const fresh = await createConversation(project.id);
    if (!fresh) return;
    setConversations((current) => [fresh, ...current]);
    setActiveConversationId(fresh.id);
  }, [project.id]);

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      const ok = await deleteConversationApi(project.id, conversationId);
      if (!ok) return;
      setConversations((current) => {
        const next = current.filter((conversation) => conversation.id !== conversationId);
        if (next.length === 0) {
          void createConversation(project.id).then((fresh) => {
            if (fresh) {
              setConversations([fresh]);
              setActiveConversationId(fresh.id);
            }
          });
        } else if (conversationId === activeConversationId) {
          setActiveConversationId(next[0]!.id);
        }
        return next;
      });
    },
    [activeConversationId, project.id],
  );

  const handleRenameConversation = useCallback(
    async (conversationId: string, title: string) => {
      const trimmed = title.trim() || null;
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, title: trimmed }
            : conversation,
        ),
      );
      await patchConversation(project.id, conversationId, { title: trimmed });
    },
    [project.id],
  );

  const handleProjectRename = useCallback(
    (nextName: string) => {
      const trimmed = nextName.trim();
      if (!trimmed || trimmed === project.name) return;
      const updated: Project = { ...project, name: trimmed, updatedAt: Date.now() };
      onProjectChange(updated);
      void patchProject(project.id, { name: trimmed });
    },
    [onProjectChange, project],
  );

  const handleApplySchema = useCallback(async () => {
    setRuntimeBusy('apply-schema');
    setRuntimeError(null);
    try {
      const next = await applyShopHomePageSchema(project.id, schemaEditor);
      hydrateRuntimeState(next);
      await refreshProjectFiles();
      onTouchProject();
    } catch (err) {
      setRuntimeError(localizeStorefrontText(String(err instanceof Error ? err.message : err)));
    } finally {
      setRuntimeBusy(null);
    }
  }, [hydrateRuntimeState, onTouchProject, project.id, refreshProjectFiles, schemaEditor]);

  const handleGenerateAssets = useCallback(async () => {
    setRuntimeBusy('generate-assets');
    setRuntimeError(null);
    handledTerminalTaskIdsRef.current = new Set();
    try {
      const result = await enqueueShopHomePageAssets(project.id, false);
      hydrateRuntimeState(result.state);
      if (result.tasks.length === 0) {
        setRuntimeBusy(null);
        return;
      }
      setGenerateQueue(result.tasks);
      // Queue processes in background; polling effect below will handle progress.
    } catch (err) {
      const message = localizeStorefrontText(String(err instanceof Error ? err.message : err));
      setRuntimeError(message);
      setRuntimeBusy(null);
    }
  }, [hydrateRuntimeState, project.id]);

  // Poll generate queue progress and refresh preview as each image finishes.
  useEffect(() => {
    if (generateQueue.length === 0) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const tasks = await fetchShopHomePageAssetTasks(project.id);
        if (cancelled) return;

        setGenerateQueue(tasks);
        if (tasks.length === 0) {
          await Promise.all([
            refreshProjectFiles(),
            refreshRuntimeState({ silent: true }),
          ]);
          if (cancelled) return;
          setRuntimeBusy(null);
          return;
        }

        const terminalTasks = tasks.filter(isTerminalAssetTask);
        const newTerminalTasks = terminalTasks.filter(
          (task) => !handledTerminalTaskIdsRef.current.has(task.id),
        );
        if (newTerminalTasks.length > 0) {
          for (const task of newTerminalTasks) {
            handledTerminalTaskIdsRef.current.add(task.id);
          }
          await Promise.all([
            refreshProjectFiles(),
            refreshRuntimeState({ silent: true }),
          ]);
          if (cancelled) return;
          onTouchProject();
        }

        if (tasks.length > 0 && terminalTasks.length === tasks.length) {
          setGenerateQueue([]);
          setRuntimeBusy(null);
        }
      } catch {
        // Swallow poll errors silently; will retry next tick
      }
    };

    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [generateQueue.length, project.id, refreshProjectFiles, refreshRuntimeState, onTouchProject]);

  const projectMeta = useMemo(() => {
    const skillName = skills.find((skill) => skill.id === project.skillId)?.name;
    const localizedSkillName = skillName === 'shop-home-page' ? '店铺首页技能' : skillName;
    const designSystemName = designSystems.find((designSystem) => designSystem.id === project.designSystemId)?.title;
    return [localizedSkillName, designSystemName, '对话式店铺首页']
      .filter(Boolean)
      .join(' · ');
  }, [designSystems, project.designSystemId, project.skillId, skills]);

  const [initialDraft, setInitialDraft] = useState<string | undefined>(project.pendingPrompt);
  useEffect(() => {
    if (initialDraft && activeConversationId) {
      setInitialDraft(undefined);
    }
  }, [activeConversationId, initialDraft]);

  useEffect(() => {
    if (project.pendingPrompt) onClearPendingPrompt();
  }, [onClearPendingPrompt, project.pendingPrompt]);

  const projectFileNames = useMemo(
    () => new Set(projectFiles.map((file) => file.name)),
    [projectFiles],
  );

  useEffect(() => {
    if (!routeFileName) return;
    requestOpenFile(routeFileName);
  }, [requestOpenFile, routeFileName]);

  const lastSyncedFileRef = useRef<string | null>(null);
  useEffect(() => {
    const target = openTabsState.active && projectFileNames.has(openTabsState.active)
      ? openTabsState.active
      : null;
    if (target === lastSyncedFileRef.current) return;
    lastSyncedFileRef.current = target;
    navigate(
      { kind: 'project', projectId: project.id, fileName: target },
      { replace: true },
    );
  }, [openTabsState.active, project.id, projectFileNames]);

  const confirmedModules = runtimeState?.requirements?.modules ?? [];
  const stylePresetId = runtimeState?.styleGuide?.preset_id ?? 'auto';
  const requirementsConfirmed = runtimeState?.requirements?.status === 'confirmed';
  const validationErrors = (runtimeState?.validationErrors ?? []).map(localizeStorefrontText);
  const runtimeLogs = runtimeState?.logs ?? [];
  const hasSchemaText = schemaEditor.trim().length > 0;
  const runtimeStatusLabel = storefrontStatusLabel(runtimeState?.status ?? 'idle');
  const fileEntries = SHOP_HOME_PAGE_FILE_META.map(({ fileName, title, description }) => ({
    fileName,
    title,
    description,
    exists: projectFiles.some((file) => file.name === fileName),
  }));
  const previewSummary = confirmedModules.length > 0
    ? `已确认模块：${confirmedModules.map(storefrontModuleLabel).join(' → ')}`
    : '等待左侧完成需求澄清';
  const previewMeta = `当前风格：${storefrontStylePresetLabel(stylePresetId)} · ${previewSummary}`;
  const shopHomePagePreviewTab = useMemo(
    () => ({
      id: '__shop_home_page_preview__',
      label: '手机预览',
      icon: 'eye' as const,
      render: () => (
        <section className="storefront-runtime-pane storefront-runtime-tab-pane">
          <div className="storefront-runtime-head">
            <div>
            </div>
            <div className="storefront-runtime-head-actions">
              <span className={`storefront-runtime-status storefront-status-${runtimeState?.status ?? 'idle'}`}>
                {runtimeStatusLabel}
              </span>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  void refreshProjectFiles();
                  void refreshRuntimeState();
                }}
                disabled={runtimeBusy !== null || runtimeLoading}
              >
                刷新
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => void handleGenerateAssets()}
                disabled={runtimeBusy !== null || runtimeLoading || streaming}
              >
                {generateQueue.length > 0
                  ? `生成中 ${generateQueue.filter((t) => t.status === 'done').length}/${generateQueue.length}`
                  : '生成素材'}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setActivePanel('schema')}
                disabled={runtimeLoading}
              >
                结构与校验
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setActivePanel('logs')}
                disabled={runtimeLoading}
              >
                运行日志
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setActivePanel('files')}
                disabled={runtimeLoading}
              >
                项目文件
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => void handleApplySchema()}
                disabled={runtimeBusy !== null || runtimeLoading || !hasSchemaText}
              >
                应用结构
              </button>
            </div>
          </div>

          {runtimeError ? (
            <div className="storefront-error-banner storefront-runtime-error-banner">
              {runtimeError}
            </div>
          ) : null}

          <div className="storefront-runtime-preview">
            {runtimeLoading ? (
              <div className="storefront-runtime-empty">正在加载预览...</div>
            ) : runtimeState?.schema ? (
              <ShopHomePagePhonePreview
                key={`${project.id}-${runtimeState.previewUpdatedAt ?? 0}`}
                projectId={project.id}
                schema={runtimeState.schema}
              />
            ) : (
              <div className="storefront-runtime-empty">
                预览尚未就绪，请先在左侧完成澄清并生成结构。
              </div>
            )}
          </div>
        </section>
      ),
    }),
    [
      handleApplySchema,
      handleGenerateAssets,
      hasSchemaText,
      previewMeta,
      project.id,
      refreshProjectFiles,
      refreshRuntimeState,
      runtimeBusy,
      runtimeError,
      runtimeLoading,
      runtimeState?.previewUpdatedAt,
      runtimeState?.schema,
      runtimeState?.status,
      runtimeStatusLabel,
      streaming,
    ],
  );

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-left">
          <button
            className="ghost back-btn"
            onClick={onBack}
            title="返回项目列表"
            aria-label="返回项目列表"
          >
            <Icon name="arrow-left" size={14} />
          </button>
          <span className="brand-mark" aria-hidden>
            <img src="/logo.svg" alt="" className="brand-mark-img" draggable={false} />
          </span>
          <div className="topbar-title">
            <span
              className="title editable"
              tabIndex={0}
              role="textbox"
              suppressContentEditableWarning
              contentEditable
              onBlur={(event) => handleProjectRename(event.currentTarget.textContent ?? '')}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  (event.currentTarget as HTMLElement).blur();
                }
              }}
            >
              {project.name}
            </span>
            <span className="meta">{projectMeta}</span>
          </div>
        </div>
        <div className="topbar-right">
          <AvatarMenu
            config={config}
            agents={agents}
            daemonLive={daemonLive}
            onModeChange={onModeChange}
            onAgentChange={onAgentChange}
            onAgentModelChange={onAgentModelChange}
            onOpenSettings={onOpenSettings}
            onRefreshAgents={onRefreshAgents}
            onBack={onBack}
          />
        </div>
      </div>

      <div className="split">
        <ChatPane
          key={activeConversationId ?? 'no-conv'}
          messages={messages}
          streaming={streaming}
          error={error}
          projectId={project.id}
          projectFiles={projectFiles}
          projectFileNames={projectFileNames}
          onRefreshProjectFiles={async () => {
            await refreshProjectFiles();
          }}
          onEnsureProject={async () => project.id}
          onSend={handleSend}
          onStop={handleStop}
          onRequestOpenFile={requestOpenFile}
          initialDraft={initialDraft}
          onSubmitForm={(text, attachments) => {
            if (streaming) return;
            void handleSend(text, attachments ?? []);
          }}
          onNewConversation={handleNewConversation}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          onOpenSettings={onOpenSettings}
        />

        <FileWorkspace
          projectId={project.id}
          files={projectFiles}
          onRefreshFiles={async () => {
            await refreshProjectFiles();
          }}
          isDeck={false}
          streaming={streaming}
          openRequest={openRequest}
          tabsState={openTabsState}
          onTabsStateChange={persistTabsState}
          leadingTab={shopHomePagePreviewTab}
        />
      </div>

      {activePanel === 'schema' ? (
        <div className="modal-backdrop" onClick={() => setActivePanel(null)}>
          <div
            className="modal storefront-panel-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="结构与校验"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="storefront-panel-dialog-head">
              <div className="modal-head">
                <span className="kicker">结构与校验</span>
                <h2>编辑当前结构</h2>
                <p className="subtitle">
                  当前正在编辑页面结构文件。修改后可直接在弹窗内应用，并同步更新右侧预览。
                </p>
              </div>
              <button type="button" className="ghost storefront-panel-close" onClick={() => setActivePanel(null)}>
                <Icon name="close" size={14} />
              </button>
            </div>

            {validationErrors.length > 0 ? (
              <div className="storefront-runtime-errors">
                <strong>校验问题</strong>
                <pre>{validationErrors.join('\n')}</pre>
              </div>
            ) : (
              <div className="storefront-runtime-card">
                <strong>校验状态</strong>
                <span>{requirementsConfirmed ? '需求已确认，当前结构校验通过。' : '需求尚未完全确认，请留意左侧对话结果。'}</span>
              </div>
            )}

            <div className="storefront-panel-scroll">
              <textarea
                className="storefront-runtime-textarea storefront-panel-textarea"
                value={schemaEditor}
                onChange={(event) => {
                  setSchemaEditor(event.target.value);
                  setSchemaDirty(true);
                }}
                spellCheck={false}
              />
            </div>

            <div className="modal-foot">
              {schemaDirty ? (
                <span className="storefront-panel-footnote">有未应用的本地修改</span>
              ) : (
                <span className="storefront-panel-footnote">当前内容已与工作台同步</span>
              )}
              <button type="button" className="ghost" onClick={() => setActivePanel(null)}>
                关闭
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => void handleApplySchema()}
                disabled={runtimeBusy !== null || runtimeLoading || !hasSchemaText}
              >
                应用结构
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activePanel === 'logs' ? (
        <div className="modal-backdrop" onClick={() => setActivePanel(null)}>
          <div
            className="modal storefront-panel-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="运行日志"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="storefront-panel-dialog-head">
              <div className="modal-head">
                <span className="kicker">运行日志</span>
                <h2>预览与素材记录</h2>
                <p className="subtitle">这里展示结构应用、预览编译和素材生成的运行状态。</p>
              </div>
              <button type="button" className="ghost storefront-panel-close" onClick={() => setActivePanel(null)}>
                <Icon name="close" size={14} />
              </button>
            </div>

            <div className="storefront-panel-scroll">
              {runtimeLogs.length > 0 ? (
                <div className="storefront-runtime-log-list">
                  {[...runtimeLogs].reverse().map((entry) => (
                    <div
                      key={`${entry.at}-${entry.message}`}
                      className={`storefront-runtime-log storefront-runtime-log-${entry.level}`}
                    >
                      <span>{new Date(entry.at).toLocaleString('zh-CN')}</span>
                      <p>{storefrontLogMessage(entry.message)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="storefront-runtime-empty storefront-runtime-empty-small">
                  暂无运行日志。
                </div>
              )}
            </div>

            <div className="modal-foot">
              <button type="button" className="ghost" onClick={() => setActivePanel(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activePanel === 'files' ? (
        <div className="modal-backdrop" onClick={() => setActivePanel(null)}>
          <div
            className="modal storefront-panel-dialog storefront-panel-dialog-narrow"
            role="dialog"
            aria-modal="true"
            aria-label="项目文件"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="storefront-panel-dialog-head">
              <div className="modal-head">
                <span className="kicker">项目文件</span>
                <h2>关键产物</h2>
                <p className="subtitle">以下文件用于承接需求、风格、结构和预览产物。</p>
              </div>
              <button type="button" className="ghost storefront-panel-close" onClick={() => setActivePanel(null)}>
                <Icon name="close" size={14} />
              </button>
            </div>

            <div className="storefront-panel-scroll">
              <div className="storefront-panel-file-list">
                {fileEntries.map(({ fileName, title, description, exists }) => (
                  exists ? (
                    <a
                      key={fileName}
                      className="storefront-panel-file-item"
                      href={projectFileUrl(project.id, fileName)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <div>
                        <strong>{title}</strong>
                        <span>{description}</span>
                      </div>
                      <Icon name="chevron-right" size={14} />
                    </a>
                  ) : (
                    <div key={fileName} className="storefront-panel-file-item is-missing">
                      <div>
                        <strong>{title}</strong>
                        <span>{description} 当前还未生成。</span>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>

            <div className="modal-foot">
              <button type="button" className="ghost" onClick={() => setActivePanel(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function storefrontStatusLabel(status: string): string {
  switch (status) {
    case 'requirements-ready':
      return '需求已整理';
    case 'schema-ready':
      return '结构已就绪';
    case 'schema-error':
      return '结构有问题';
    case 'assets-ready':
      return '素材已生成';
    case 'idle':
      return '空闲';
    default:
      return '处理中';
  }
}

function storefrontModuleLabel(moduleType: string): string {
  switch (moduleType) {
    case 'top_slider':
      return '头图轮播';
    case 'user_assets':
      return '会员资产区';
    case 'banner':
      return '活动横幅';
    case 'goods':
      return '商品模块';
    case 'shop_info':
      return '门店信息';
    default:
      return '未命名模块';
  }
}

function storefrontStylePresetLabel(presetId: string): string {
  if (SHOP_HOME_PAGE_TONE_LABELS[presetId]) {
    return SHOP_HOME_PAGE_TONE_LABELS[presetId];
  }
  switch (presetId) {
    case 'auto':
      return '自动匹配';
    case 'bakery-handdrawn-cream':
      return '烘焙手绘奶油风';
    default:
      return '自定义风格';
  }
}

function storefrontLogMessage(message: string): string {
  return message
    .split('\n')
    .map((line) => storefrontLogLine(line))
    .join('\n');
}

function storefrontLogLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return '';

  const exact: Record<string, string> = {
    'Legacy storefront brief was converted into storefront.requirements.json.': '已将旧版店铺首页需求转换为结构化需求文件。',
    'storefront.schema.json applied and preview recompiled.': '页面结构已应用，预览已重新编译。',
    'Schema generated and preview recompiled.': '页面结构已生成，预览已重新编译。',
    'No pending storefront image slots required generation.': '当前没有待生成的图片槽位。',
  };
  if (exact[trimmed]) return exact[trimmed];

  const generatedMatch = trimmed.match(/^Generated (\d+) storefront asset\(s\)\.$/);
  if (generatedMatch) {
    return `已生成 ${generatedMatch[1]} 个首页素材。`;
  }

  const assetSuccessMatch = trimmed.match(/^([^:]+): generated$/);
  if (assetSuccessMatch) {
    return `已生成素材：${storefrontAssetLabel(assetSuccessMatch[1] ?? '')}`;
  }

  const assetErrorMatch = trimmed.match(/^([^:]+): (.+)$/);
  if (assetErrorMatch) {
    return `素材生成失败：${storefrontAssetLabel(assetErrorMatch[1] ?? '')}，${localizeStorefrontText(assetErrorMatch[2] ?? '')}`;
  }

  return localizeStorefrontText(trimmed);
}

function storefrontAssetLabel(fileName: string): string {
  if (fileName.startsWith('storefront-hero-')) return '头图素材';
  if (fileName.startsWith('storefront-banner-')) return '横幅素材';
  if (fileName.startsWith('storefront-featured-')) return '主推商品素材';
  if (fileName.startsWith('storefront-grid-')) return '商品网格素材';
  if (fileName.startsWith('storefront-brand-')) return '品牌故事素材';
  if (fileName.startsWith('user-assets-entry-')) return '客户资产入口素材';
  return '图片素材';
}

function localizeStorefrontText(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const exact: Record<string, string> = {
    'Image generation requires OPENAI_API_KEY or an API key in Settings.': '素材生成需要先在设置中配置 OpenAI API Key，或在 .env 中配置 OPENAI_IMAGE_API_KEY / OPENAI_API_KEY。',
    'Image generation requires OPENAI_IMAGE_API_KEY or OPENAI_API_KEY.': '素材生成需要先在设置中配置 OpenAI API Key，或在 .env 中配置 OPENAI_IMAGE_API_KEY / OPENAI_API_KEY。',
    'storefront.schema.json must be valid JSON.': '页面结构文件必须是合法的 JSON。',
    'Generate a valid storefront.schema.json before generating assets.': '请先生成合法的页面结构文件，再生成素材。',
    'storefront.schema.json is not valid JSON after the agent run.': '智能体执行后，页面结构文件仍不是合法的 JSON。',
    'top_slider.data.mode must be "single" when there is only one hero slide.': '当只有一张头图时，头图轮播模式必须为“单图”。',
    'top_slider.data.mode must be "carousel_poster" when there are multiple hero slides.': '当存在多张头图时，头图轮播模式必须为“海报轮播”。',
  };
  if (exact[trimmed]) return exact[trimmed];

  const topSliderCountMatch = trimmed.match(/^top_slider\.data\.items must contain exactly (\d+) item\(s\), found (\d+)\.$/);
  if (topSliderCountMatch) {
    return `头图轮播条目数量必须严格等于 ${topSliderCountMatch[1]} 项，当前为 ${topSliderCountMatch[2]} 项。`;
  }

  const goodsCountMatch = trimmed.match(/^goods\.data\.items must contain exactly (\d+) item\(s\), found (\d+)\.$/);
  if (goodsCountMatch) {
    return `商品条目数量必须严格等于 ${goodsCountMatch[1]} 项，当前为 ${goodsCountMatch[2]} 项。`;
  }

  return trimmed
    .replaceAll('storefront.schema.json', '页面结构文件')
    .replaceAll('storefront.requirements.json', '需求结构文件')
    .replaceAll('storefront.style-guide.json', '风格指南文件');
}
