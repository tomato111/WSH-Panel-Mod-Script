// ==PREPROCESSOR==
// @name "Date Modoki"
// @version "1.0.0"
// @author "tomato111"
// ==/PREPROCESSOR==

//年 %YYYY 4桁
//年 %YY 2桁
//年 %Y 2桁（桁合わせ無し）
//月 %MM
//月 %M （桁合わせ無し）
//月 %ME 英語 フル
//月 %Me 英語 略字
//日 %DD
//日 %D （桁合わせ無し）

//時 %hh
//時 %h（桁合わせ無し）
//分 %mm
//分 %m（桁合わせ無し）
//秒 %ss
//秒 %s（桁合わせ無し）

//曜日 %WJ 日本 フル
//曜日 %Wj 日本 略字
//曜日 %WE 英語 フル
//曜日 %We 英語 略字


//========
// properties
//========
var prop = new function () {

    this.Style = {
        _format: window.GetProperty('Style._format', '%YYYY-%MM-%DD %hh:%mm:%ss (%We)'),
        Color:
            {
                _0_Default: window.GetProperty('Style.Color._0_Default', 'RGBA(0,0,0,255)'),
                _1_Year: window.GetProperty('Style.Color._1_Year', 'RGBA(0,0,0,255)'),
                _2_Month: window.GetProperty('Style.Color._2_Month', 'RGBA(0,0,0,255)'),
                _3_Day: window.GetProperty('Style.Color._3_Day', 'RGBA(0,0,0,255)'),
                _4_Hour: window.GetProperty('Style.Color._4_Hour', 'RGBA(0,0,0,255)'),
                _5_Minute: window.GetProperty('Style.Color._5_Minute', 'RGBA(0,0,0,255)'),
                _6_Second: window.GetProperty('Style.Color._6_Second', 'RGBA(0,0,0,255)'),
                _7_DayOfWeek: window.GetProperty('Style.Color._7_DayOfWeek', 'RGBA(0,0,0,255)'),
                _8_DayOfWeek_sat: window.GetProperty('Style.Color._8_DayOfWeek_sat', 'RGBA(0,0,200,255)'),
                _9_DayOfWeek_sun: window.GetProperty('Style.Color._9_DayOfWeek_sun', 'RGBA(200,0,0,255)'),
                Background: window.GetProperty('Style.Color.Background', 'RGBA(255,255,255,255)')
            },
        Font_Family: window.GetProperty('Style.Font_Family', 'Arial'),
        Font_Size: window.GetProperty('Style.Font_Size', 14),
        Font_Bold: window.GetProperty('Style.Font_Bold', false)
    };

};
//========


//============================================
//== Prototype ==================================
//============================================
Function.prototype.interval = function (time, callback) {
    var __method = this;
    var __callback = callback || function () { };
    this.$$timerid$$ = window.setInterval(function () {
        __method.apply(this, arguments);
        __callback.apply(this, arguments);
    }, time);
};

Function.prototype.clearInterval = function () {
    window.clearInterval(this.$$timerid$$);
};

//============================================
//== function ==================================
//============================================

function RGBA(r, g, b, a) {
    var res = 0xff000000 | (r << 16) | (g << 8) | (b);
    if (a != undefined) res = (res & 0x00ffffff) | (a << 24);
    return res;
}


//============================================
//== DateModoki Object ==========================
//============================================
var DateModoki = new function () {
    this.on_paint = function (gr, x, y) {

        gr.FillSolidRect(-1, -1, window.Width + 2, window.Height + 2, color['Background']);

        for (var i = 0; i < applied_text_arr.length; i++) {

            var text = applied_text_arr[i].toString();
            if (format.type_arr[i] === '_6_Second') {
                switch (format.text_arr[i]) {
                    case '%ss': text = ('0' + (Number(text) + timer_count)).slice(-2); break;
                    case '%s': text = (Number(text) + timer_count).toString(); break;
                }
            }

            gr.DrawString(text, font, color[format.type_arr[i]], x, y, window.Width, window.Height, 0x00000000);
            x += gr.MeasureString(text.replace(/ /g, ''), font, 0, 0, window.Width, window.Height, 0).Width
                + (text.split(' ').length - 1) * spaceWidth; // MeasureStringメソッドは空白の幅を0と返すので、あらかじめ求めておいたspaceWidthを使って補完する
        }
    };

    this.start = function () {
        setFontAndColor();
        setDate();
        window.Repaint();
        timer.interval(1000);
    };


    var timer = function () {
        timer_count++;
        if (date_now.getSeconds() + timer_count === 60) {
            setDate();
            window.Repaint()
        }
        else
            format.isContain_Second && window.Repaint();
    };

    var setDate = function () {
        timer_count = 0;
        date_now = new Date();
        applied_text_arr = format.applyDate(date_now);
    };

    var setFontAndColor = function () {
        var fontfamily = ['Arial', 'Tahoma', 'Meiryo', 'Segoe UI', 'MS Gothic'];
        fontfamily.unshift(prop.Style.Font_Family);
        for (i = 0; i < fontfamily.length; i++) {
            if (utils.CheckFont(fontfamily[i])) {
                window.SetProperty('Style.Font_Family', prop.Style.Font_Family = fontfamily[i]);
                break;
            }
        }

        font = gdi.Font(prop.Style.Font_Family, prop.Style.Font_Size, Number(prop.Style.Font_Bold));
        color = [];

        for (var name in prop.Style.Color) {
            color[name] = eval(prop.Style.Color[name]);
        }


        var temp_bmp = gdi.CreateImage(1, 1);
        var temp_gr = temp_bmp.GetGraphics();

        spaceWidth = temp_gr.MeasureString(' ,', font, 0, 0, window.Width, window.Height, 0).Width
                   - temp_gr.MeasureString(',', font, 0, 0, window.Width, window.Height, 0).Width;

        temp_bmp.ReleaseGraphics(temp_gr);
        temp_bmp.Dispose();
        temp_gr = null;
        temp_bmp = null;
    };


    var timer_count, date_now, applied_text_arr = [],
        spaceWidth, font, color;


    var format = new ParseFormat(prop.Style._format);
    // Constructor
    function ParseFormat(formatText) {
        this.text_arr = [];
        this.type_arr = [];
        this.isContain_Second = false;

        var i = 0;
        var type = { YYYY: '_1_Year', YY: '_1_Year', Y: '_1_Year', MM: '_2_Month', ME: '_2_Month', Me: '_2_Month', M: '_2_Month', DD: '_3_Day', D: '_3_Day', hh: '_4_Hour', h: '_4_Hour', mm: '_5_Minute', m: '_5_Minute', ss: '_6_Second', s: '_6_Second', WJ: '_7_DayOfWeek', Wj: '_7_DayOfWeek', WE: '_7_DayOfWeek', We: '_7_DayOfWeek' };
        var dateRE = /%(?:YYYY|YY|Y|MM|ME|Me|M|DD|D|hh|h|mm|m|ss|s|WJ|Wj|WE|We)/g;
        while (dateRE.exec(formatText) !== null) {
            if (i !== RegExp.index) {
                this.text_arr.push(formatText.substring(i, RegExp.index).replace(/　/g, ' '));
                this.type_arr.push('_0_Default');
            }
            this.text_arr.push(RegExp.lastMatch);
            this.type_arr.push(type[RegExp.lastMatch.slice(1)]);
            type[RegExp.lastMatch.slice(1)] === '_6_Second' && (this.isContain_Second = true);
            i = RegExp.lastIndex;
        }
        if (i !== formatText.length) {
            this.text_arr.push(formatText.substring(i, formatText.length));
            this.type_arr.push('_0_Default');
        }

    }
    ParseFormat.prototype.applyDate = function (dateObj) {
        var arr = [], _this = this;
        for (var i = 0; i < this.text_arr.length; i++) {
            switch (this.text_arr[i]) {
                case '%YYYY': arr.push(dateObj.getFullYear()); break;
                case '%YY': arr.push(dateObj.getFullYear().toString().slice(2)); break;
                case '%Y': arr.push(Number(dateObj.getFullYear().toString().slice(2))); break;
                case '%MM': arr.push(('0' + (dateObj.getMonth() + 1)).slice(-2)); break;
                case '%ME': arr.push(monthToString(dateObj.getMonth(), false)); break;
                case '%Me': arr.push(monthToString(dateObj.getMonth(), true)); break;
                case '%M': arr.push(dateObj.getMonth() + 1); break;
                case '%DD': arr.push(('0' + dateObj.getDate()).slice(-2)); break;
                case '%D': arr.push(dateObj.getDate()); break;
                case '%hh': arr.push(('0' + dateObj.getHours()).slice(-2)); break;
                case '%h': arr.push(dateObj.getHours()); break;
                case '%mm': arr.push(('0' + dateObj.getMinutes()).slice(-2)); break;
                case '%m': arr.push(dateObj.getMinutes()); break;
                case '%ss': arr.push(('0' + dateObj.getSeconds()).slice(-2)); break;
                case '%s': arr.push(dateObj.getSeconds()); break;
                case '%WJ': arr.push(dayToString(dateObj.getDay(), false, 'ja')); setDayColor(dateObj.getDay(), i); break;
                case '%Wj': arr.push(dayToString(dateObj.getDay(), true, 'ja')); setDayColor(dateObj.getDay(), i); break;
                case '%WE': arr.push(dayToString(dateObj.getDay(), false, 'en')); setDayColor(dateObj.getDay(), i); break;
                case '%We': arr.push(dayToString(dateObj.getDay(), true, 'en')); setDayColor(dateObj.getDay(), i); break;
                default: arr.push(this.text_arr[i]); break;
            }
        }

        function monthToString(num, shorter) {
            if (shorter)
                return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][num];
            else
                return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][num];
        }

        function dayToString(num, shorter, lang) {
            if (shorter)
                switch (lang) {
                    case 'en': return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][num];
                    case 'ja': return ['日', '月', '火', '水', '木', '金', '土'][num];
                }
            else
                switch (lang) {
                    case 'en': return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][num];
                    case 'ja': return ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][num];
                }
        }

        function setDayColor(num, i) {
            if (num === 0)
                _this.type_arr[i] = '_9_DayOfWeek_sun';
            else if (num === 6)
                _this.type_arr[i] = '_8_DayOfWeek_sat';
        }

        return arr;
    };
    // End Constructor 

};

DateModoki.start();


//========================================
//== Callback function =========================
//========================================
function on_paint(gr) {
    DateModoki.on_paint(gr, 4, 4);
}

//EOF