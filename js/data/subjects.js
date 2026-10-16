/* ============ 七个领域 ============
   圣经与信仰是每天的固定块，其余六个按周例行分配。key 存在数据库里，label 和颜色只在前端。
   label / short 是取值时翻译的 getter，所以到处直接用 SUBJECTS[k].label 就能跟着界面语言走。 */
import { t } from "../core/i18n.js";

const def = (label, short, color) => ({ get label(){ return t(label); }, get short(){ return t(short); }, color });
const SUBJECTS = {
  bible:     def("圣经与信仰", "圣经", "#D98E2B"),
  language:  def("阅读与语言", "语言", "#45658F"),
  math:      def("数学",       "数学", "#4F8D6A"),
  history:   def("历史与地理", "历史", "#9B7BB8"),
  science:   def("科学与自然", "科学", "#3F8F8B"),
  arts:      def("艺术与音乐", "艺术", "#B44B60"),
  life:      def("品格与生活", "品格", "#C8743A")
};
const subject = k => SUBJECTS[k] || { label: k, short: k, color: "var(--muted)" };
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
// “周一” 这样的标签，按界面语言
const weekdayLabel = d => t("周" + WEEKDAYS[d]);

export { SUBJECTS, subject, WEEKDAYS, weekdayLabel };
