/* ============ 七个领域 ============
   圣经与信仰是每天的固定块，其余六个按周例行分配。key 存在数据库里，label 和颜色只在前端。 */
const SUBJECTS = {
  bible:     { label: "圣经与信仰", short: "圣经", color: "#D98E2B" },
  language:  { label: "阅读与语言", short: "语言", color: "#45658F" },
  math:      { label: "数学",       short: "数学", color: "#4F8D6A" },
  history:   { label: "历史与地理", short: "历史", color: "#9B7BB8" },
  science:   { label: "科学与自然", short: "科学", color: "#3F8F8B" },
  arts:      { label: "艺术与音乐", short: "艺术", color: "#B44B60" },
  life:      { label: "品格与生活", short: "品格", color: "#C8743A" }
};
const subject = k => SUBJECTS[k] || { label: k, short: k, color: "var(--muted)" };
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export { SUBJECTS, subject, WEEKDAYS };
