type DataForSeoCreateTaskInput = {
  target: string;
  startUrl: string;
  maxCrawlPages: number;
};

type DataForSeoTaskResponse = {
  id: string | null;
  raw: unknown;
};

const DATAFORSEO_API_URL = "https://api.dataforseo.com/v3";

const getDataForSeoAuthHeader = () => {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    throw new Error("DataForSEO credentials are not configured.");
  }

  return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
};

const getFirstTask = (raw: unknown) => {
  if (!raw || typeof raw !== "object" || !("tasks" in raw)) {
    return null;
  }

  const tasks = (raw as { tasks?: unknown }).tasks;

  if (!Array.isArray(tasks)) {
    return null;
  }

  return tasks[0] as Record<string, unknown> | undefined;
};

const getProviderMessage = (raw: unknown) => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const data = raw as Record<string, unknown>;

  if (typeof data.status_message === "string" && data.status_message.trim()) {
    return data.status_message.trim();
  }

  const task = getFirstTask(raw);

  if (
    typeof task?.status_message === "string" &&
    task.status_message.trim()
  ) {
    return task.status_message.trim();
  }

  return null;
};

const requestDataForSeo = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const res = await fetch(`${DATAFORSEO_API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: getDataForSeoAuthHeader(),
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as T;

  if (!res.ok) {
    const providerMessage = getProviderMessage(data);

    throw new Error(
      providerMessage
        ? `DataForSEO request failed (${res.status}): ${providerMessage}`
        : `DataForSEO request failed with status ${res.status}.`,
    );
  }

  return data;
};

const createOnPageTask = async (
  input: DataForSeoCreateTaskInput,
): Promise<DataForSeoTaskResponse> => {
  const payload = [
    {
      target: input.target,
      start_url: input.startUrl,
      max_crawl_pages: input.maxCrawlPages,
      enable_javascript: true,
      load_resources: true,
      enable_browser_rendering: true,
      check_spell: false,
    },
  ];

  const raw = await requestDataForSeo<unknown>("/on_page/task_post", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const task = getFirstTask(raw);

  return {
    id: typeof task?.id === "string" ? task.id : null,
    raw,
  };
};

const getOnPageSummary = async (taskId: string) => {
  return requestDataForSeo<unknown>(
    `/on_page/summary/${encodeURIComponent(taskId)}`,
    {
      method: "GET",
    },
  );
};

const getOnPagePages = async (taskId: string) => {
  return requestDataForSeo<unknown>("/on_page/pages", {
    method: "POST",
    body: JSON.stringify([
      {
        id: taskId,
        limit: 1000,
      },
    ]),
  });
};

const getOnPageLinks = async (taskId: string) => {
  return requestDataForSeo<unknown>("/on_page/links", {
    method: "POST",
    body: JSON.stringify([
      {
        id: taskId,
        limit: 1000,
      },
    ]),
  });
};

const getBacklinksSummary = async (target: string) => {
  return requestDataForSeo<unknown>("/backlinks/summary/live", {
    method: "POST",
    body: JSON.stringify([
      {
        target,
        include_subdomains: true,
      },
    ]),
  });
};

const dataForSeoClient = {
  createOnPageTask,
  getBacklinksSummary,
  getOnPageLinks,
  getOnPagePages,
  getOnPageSummary,
};

export { dataForSeoClient };
export type { DataForSeoCreateTaskInput };
