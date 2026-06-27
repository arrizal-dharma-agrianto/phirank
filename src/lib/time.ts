const normalizeDate = (date: string) => {
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    throw new Error("Invalid date string");
  }

  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export { normalizeDate }