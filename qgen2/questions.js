// 分類列表
const categories = [
    "試算表", "數據庫", "網絡技術", "編程概念", 
    "硬件知識", "軟件工程", "信息安全", "多媒體"
];

// 題目數據
const questions = [
    {
        id: 1,
        question: "志明在试算表内建立了图表1，他想修改图表1，使它成为图表2。他须修改哪项图表设定？",
        options: {
            "A": "圆例",
            "B": "资料来源",
            "C": "座標轴",
            "D": "图表類型"
        },
        correct_answer: "D",
        correct_rate: 68,
        category: ["試算表", "圖表處理"],
        difficulty: "中等",
        explanation: "要改變圖表類型（如從柱狀圖改為圓餅圖），需要修改圖表類型設定。"
    },
    {
        id: 2,
        question: "數據庫表 PROD 包含七筆記錄，如下展示：[表內容略] 執行下列 SQL 指令會輸出什麼？ SELECT MAX(WEIGHT) FROM PROD WHERE PSTAT <> 'S'",
        options: {
            "A": "1",
            "B": "5",
            "C": "6",
            "D": "11"
        },
        correct_answer: "B",
        correct_rate: 67,
        category: ["數據庫", "SQL"],
        difficulty: "中等",
        explanation: "這個查詢找出PSTAT不是'S'的記錄中WEIGHT的最大值，符合條件的記錄中WEIGHT最大值是5。"
    },
    // 其他題目...
];