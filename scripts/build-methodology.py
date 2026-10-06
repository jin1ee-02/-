"""Export the Korean methodology and exact static prompts to a readable PDF.

Run with the Codex bundled Python (reportlab, pypdf, pypdfium2, Pillow).
This is document authoring; it never imports or executes the application.
"""

import ast
import html
import json
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Flowable, KeepTogether, LongTable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, TableStyle

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "MVP-구현-방법론.md"
OUTPUT = ROOT / "output" / "pdf" / "KU래쪄용-MVP-구현과-방법론.pdf"


def extract_constants(path):
    values = {}
    for node in ast.parse(path.read_text(encoding="utf-8-sig")).body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            try:
                values[node.targets[0].id] = ast.literal_eval(node.value)
            except (ValueError, TypeError):
                pass
    return values


def add_appendices():
    source = SOURCE.read_text(encoding="utf-8-sig").split("\n## 부록 A")[0].rstrip()
    prompts = extract_constants(ROOT / "backend" / "app" / "prompts.py")
    names = ["ANALYZE_PROMPT", "REWRITE_PROMPT", "ALTERNATIVES_PROMPT", "EMOTION_PROMPT", "REACTION_PROMPT", "DEBATE_PROMPT", "JUDGE_PROMPT"]
    parts = [source, "\n## 부록 A 실제 OpenAI 프롬프트 원문\n", "아래 내용은 backend/app/prompts.py의 정적 문자열에서 추출했습니다. REWRITE_PROMPT는 보존한 단일 순화 경로이며 현재 MVP 대안 3개 생성은 ALTERNATIVES_PROMPT를 사용합니다. 토론 역할별 추가 지시는 부록 C에 있습니다.\n"]
    for name in names:
        parts.append(f"\n### {name}\n\n```text\n{prompts[name].strip()}\n```\n")
    values = extract_constants(ROOT / "backend" / "app" / "jev.py")
    parts.extend(["\n## 부록 B 실제 JEV 평가 기준\n", "backend/app/jev.py의 QUESTION_VERSION, GUARD와 평가 기준입니다. 질문 ID는 API 응답을 연결하는 키이며 모델이 읽는 자연어 질문은 각 method에서 별도로 만듭니다.\n"])
    for name in ["QUESTION_VERSION", "GUARD", "RUBRICS", "EMOTION_LEVELS", "EMOTIONS", "INTENSITY_LEVELS"]:
        value = values[name]
        text = value.strip() if isinstance(value, str) else json.dumps(value, ensure_ascii=False, indent=2)
        parts.append(f"\n### {name}\n\n```text\n{text}\n```\n")
    roles = extract_constants(ROOT / "backend" / "app" / "verdict.py")["ROLES"]
    parts.extend(["\n## 부록 C 토론 역할 지시와 회귀 사례\n", "다음 역할 지시는 DEBATE_PROMPT 뒤에 붙여 각각 독립 호출합니다. 같은 라운드의 역할 호출은 병렬로 실행하고 판사는 세 공개 의견을 받은 뒤 호출합니다.\n", "\n```json\n" + json.dumps(roles, ensure_ascii=False, indent=2) + "\n```\n", "\n준비한 test_mvp.py 회귀 사례는 초대 1회 사용, 다른 방 토큰 거부, 메시지 재시도 중복 방지, 저장소 재생성, 본인 발화 없음, 추세 비교 부족, JEV 가중 평균 불일치, 안정된 2라운드 종료입니다. 이번 작업에서 테스트를 실행하지 않았으므로 기대 계약을 명시한 사례로 읽습니다.\n"])
    SOURCE.write_text("\n".join(parts).strip() + "\n", encoding="utf-8")


pdfmetrics.registerFont(TTFont("Korean", "C:/Windows/Fonts/malgun.ttf"))
pdfmetrics.registerFont(TTFont("KoreanBold", "C:/Windows/Fonts/malgunbd.ttf"))
pdfmetrics.registerFontFamily("Korean", normal="Korean", bold="KoreanBold", italic="Korean", boldItalic="KoreanBold")
INK = colors.HexColor("#18283D")
ACCENT = colors.HexColor("#315B78")
LIGHT = colors.HexColor("#F2F5F8")
WIDTH = A4[0] - 104
STYLES = {
    "body": ParagraphStyle("Body", fontName="Korean", fontSize=10.2, leading=16.4, textColor=INK, wordWrap="CJK", spaceAfter=10, splitLongWords=True, allowWidows=0, allowOrphans=0),
    "h1": ParagraphStyle("Title", fontName="KoreanBold", fontSize=27, leading=39, textColor=colors.black, spaceAfter=24, wordWrap="CJK"),
    "h2": ParagraphStyle("Chapter", fontName="KoreanBold", fontSize=19, leading=27, textColor=colors.black, spaceAfter=21, wordWrap="CJK", keepWithNext=True),
    "h3": ParagraphStyle("Subheading", fontName="KoreanBold", fontSize=12, leading=18, textColor=ACCENT, spaceBefore=12, spaceAfter=10, keepWithNext=True, wordWrap="CJK"),
    "small": ParagraphStyle("Small", fontName="Korean", fontSize=8.4, leading=13, textColor=ACCENT, spaceAfter=10, wordWrap="CJK"),
    "code": ParagraphStyle("Code", fontName="Korean", fontSize=8.6, leading=12.5, backColor=LIGHT, borderPadding=9, spaceBefore=8, spaceAfter=16, wordWrap="CJK", splitLongWords=True, allowWidows=0, allowOrphans=0),
    "cell": ParagraphStyle("Cell", fontName="Korean", fontSize=8.7, leading=14, textColor=INK, wordWrap="CJK", splitLongWords=True),
    "header": ParagraphStyle("TableHeader", fontName="KoreanBold", fontSize=9, leading=14, textColor=colors.white, wordWrap="CJK"),
    "toc": ParagraphStyle("Contents", fontName="Korean", fontSize=10, leading=17, textColor=INK, spaceAfter=3, wordWrap="CJK"),
}


def inline(text):
    text = html.escape(text)
    text = re.sub(r"`([^`]+)`", r'<font color="#315B78">\1</font>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    return text


class Diagram(Flowable):
    def __init__(self, kind):
        super().__init__()
        self.kind = kind
        self.width = WIDTH
        self.height = 335 if kind == 0 else 235 if kind == 1 else 355

    def draw(self):
        c = self.canv
        def box(x, y, w, label, h=43):
            c.setFillColor(LIGHT)
            c.setStrokeColor(colors.HexColor("#B9C9D4"))
            c.roundRect(x, y, w, h, 8, stroke=1, fill=1)
            c.setFillColor(INK)
            c.setFont("KoreanBold", 9.1)
            lines = label.split("\n")
            for i, line in enumerate(lines):
                c.drawCentredString(x+w/2, y+h/2+3+(len(lines)-1)*6-i*13, line)
        def arrow(x1, y1, x2, y2):
            c.setStrokeColor(ACCENT)
            c.setFillColor(ACCENT)
            c.setLineWidth(1.1)
            c.line(x1,y1,x2,y2)
            import math
            angle = math.atan2(y2-y1,x2-x1)
            p = c.beginPath()
            p.moveTo(x2,y2)
            p.lineTo(x2-7*math.cos(angle-0.4),y2-7*math.sin(angle-0.4))
            p.lineTo(x2-7*math.cos(angle+0.4),y2-7*math.sin(angle+0.4))
            p.close()
            c.drawPath(p,fill=1,stroke=0)
        if self.kind == 0:
            box(30,285,150,"Expo 앱 A")
            box(310,285,150,"Expo 앱 B")
            box(170,215,150,"FastAPI API 계층")
            arrow(105,285,205,258); arrow(385,285,285,258)
            box(5,125,145,"방 토큰\nCore State")
            box(172,125,145,"분석 서비스")
            box(339,125,145,"대안 생성\n역할별 판결")
            arrow(210,215,78,168); arrow(245,215,245,168); arrow(280,215,411,168)
            box(5,35,145,"SQLite 저장")
            box(172,35,145,"JEV\n또는 OpenAI 분석")
            box(339,35,145,"OpenAI Responses")
            arrow(78,125,78,78); arrow(245,125,245,78); arrow(411,125,411,78)
        elif self.kind == 1:
            labels = ["최종 문장 선택", "토큰과 요청 ID", "최근 10개 문맥", "신호 분석", "점수와 EWMA", "원자적 저장", "두 기기 갱신"]
            for index,label in enumerate(labels):
                row,col=divmod(index,4)
                x=col*123+3; y=155-row*103
                box(x,y,113,label)
                if col and row==0: arrow(x-10,y+21,x,y+21)
                if col and row==1: arrow(x-10,y+21,x,y+21)
            arrow(430,155,430,115); arrow(430,115,58,95)
        else:
            box(148,300,195,"서버 대화 스냅샷\n보충 상황과 반론")
            for x,label in [(3,"A의 관점 대변"),(171,"B의 관점 대변"),(339,"내부 근거 검토")]:
                box(x,215,145,label)
                arrow(245,300,x+72,258)
                arrow(x+72,215,245,175)
            box(148,132,195,"판사 공개 결과\nA와 B의 6개 점수")
            arrow(245,132,245,105)
            box(148,62,195,"점수와 논점 안정성 비교")
            box(3,0,145,"필요 시 다음 라운드")
            box(339,0,145,"종료 후 결과 저장")
            arrow(195,62,75,43); arrow(295,62,411,43)


def make_table(lines):
    rows = [[cell.strip() for cell in line.strip().strip("|").split("|")] for line in lines]
    rows = [row for row in rows if not all(re.fullmatch(r":?-+:?", cell) for cell in row)]
    count = len(rows[0])
    widths = [WIDTH/count]*count
    if count == 3:
        widths = [WIDTH*0.34, WIDTH*0.22, WIDTH*0.44]
        if rows[0][0].startswith("메서드"):
            widths = [WIDTH*0.43, WIDTH*0.37, WIDTH*0.20]
        elif rows[0][0] == "테이블":
            widths = [WIDTH*0.18, WIDTH*0.47, WIDTH*0.35]
    if count == 4:
        widths = [WIDTH*0.21, WIDTH*0.36, WIDTH*0.22, WIDTH*0.21]
    data = [[Paragraph(inline(cell), STYLES["header" if row_index == 0 else "cell"]) for cell in row] for row_index,row in enumerate(rows)]
    table = LongTable(data, colWidths=widths, repeatRows=1, hAlign="LEFT", spaceBefore=7, spaceAfter=18)
    table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),ACCENT),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,LIGHT]),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),9),("RIGHTPADDING",(0,0),(-1,-1),9),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6),("LINEBELOW",(0,0),(-1,0),0.5,ACCENT)]))
    return table


def page_decoration(canvas, document):
    canvas.saveState()
    if document.page > 1:
        canvas.setFillColor(ACCENT)
        canvas.setFont("Korean",8)
        canvas.drawString(52,A4[1]-32,"KU래쪄용 MVP 구현과 방법론")
    canvas.setFillColor(ACCENT)
    canvas.setFont("Korean",8)
    canvas.drawString(52,29,"2026년 10월 6일")
    canvas.drawRightString(A4[0]-52,29,str(document.page))
    canvas.restoreState()


def build_pdf():
    source = SOURCE.read_text(encoding="utf-8")
    lines = source.splitlines()
    first_chapter = next(i for i,line in enumerate(lines) if line.startswith("## "))
    story = [Spacer(1,35),Paragraph("KU래쪄용 MVP<br/>구현과 방법론",STYLES["h1"]),Paragraph("아키텍처와 파이프라인  프롬프트와 JEV 평가 기준<br/>초기 기획 반영 상태와 실행 안내",STYLES["h3"]),Spacer(1,20)]
    intro = "\n".join(lines[2:first_chapter]).strip().split("\n\n")
    for paragraph in intro:
        story.append(Paragraph(inline(paragraph.replace("\n"," ")),STYLES["body"]))
    story.extend([Spacer(1,20),Paragraph("원격 확인 기준  8212567<br/>구현  로컬 작업 폴더<br/>실제 모델 호출과 별도 테스트  미실행",STYLES["small"]),PageBreak(),Paragraph("문서 구성",STYLES["h2"])])
    headings = [line[3:] for line in lines if line.startswith("## ")]
    for heading in headings:
        story.append(Paragraph(inline(heading),STYLES["toc"]))
    story.append(PageBreak())
    i=first_chapter
    diagrams=0
    while i < len(lines):
        line=lines[i]
        if not line.strip():
            i+=1;continue
        if line.startswith("## "):
            if not isinstance(story[-1],PageBreak):story.append(PageBreak())
            story.append(Paragraph(inline(line[3:]),STYLES["h2"]));i+=1;continue
        if line.startswith("### "):
            story.append(Paragraph(inline(line[4:]),STYLES["h3"]));i+=1;continue
        if line.startswith("```"):
            language=line[3:]; block=[];i+=1
            while i<len(lines) and not lines[i].startswith("```"):
                block.append(lines[i]);i+=1
            if language=="mermaid":
                story.extend([Diagram(diagrams),Spacer(1,12)]);diagrams+=1
            else:
                body="<br/>".join(html.escape(value).replace(" ","&nbsp;") for value in block)
                paragraph = Paragraph(body,STYLES["code"])
                height = paragraph.wrap(WIDTH, A4[1])[1]
                if height <= 230:
                    group = [paragraph]
                    if isinstance(story[-1], Paragraph) and story[-1].style is STYLES["h3"]:
                        group.insert(0, story.pop())
                    story.append(KeepTogether(group))
                else:
                    story.append(paragraph)
            i+=1;continue
        if line.startswith("|"):
            block=[]
            while i<len(lines) and lines[i].startswith("|"):
                block.append(lines[i]);i+=1
            story.append(make_table(block));continue
        block=[line];i+=1
        while i<len(lines) and lines[i].strip() and not lines[i].startswith(("#","```","|","- ")):
            block.append(lines[i]);i+=1
        story.append(Paragraph(inline(" ".join(block)),STYLES["body"]))
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    document=SimpleDocTemplate(str(OUTPUT),pagesize=A4,leftMargin=52,rightMargin=52,topMargin=57,bottomMargin=52,title="KU래쪄용 MVP 구현과 방법론",author="KU래쪄용 프로젝트 팀",pageCompression=1)
    document.build(story,onFirstPage=page_decoration,onLaterPages=page_decoration)
    from pypdf import PdfReader
    reader=PdfReader(OUTPUT)
    print(json.dumps({"pdf":str(OUTPUT),"pages":len(reader.pages),"markdown_characters":len(source)},ensure_ascii=False))


if __name__=="__main__":
    add_appendices()
    build_pdf()
