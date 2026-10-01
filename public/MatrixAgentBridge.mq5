//+------------------------------------------------------------------+
//|                                           MatrixAgentBridge.mq5  |
//|               MATRIX 10-Agent Autonomous Cloud Trading Bridge   |
//|                    Target Demo Account: 113472568               |
//|                        Copyright 2026, MATRIX Quant Labs         |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, MATRIX Quant Labs"
#property link      "https://ais-dev-pjhygmlj47ntcorhfgn63w-532419130457.europe-west2.run.app"
#property version   "2.10"
#property strict

#include <Trade\Trade.mqh>

input ulong    InpTargetAccount = 113472568;                       // Demo Account Number (113472568)
input string   InpServerUrl     = "https://ais-dev-pjhygmlj47ntcorhfgn63w-532419130457.europe-west2.run.app"; // Cloud Server URL
input int      InpPollSeconds   = 2;                                // Polling Interval (Seconds)
input ulong    InpMagicNumber   = 888999;                           // Magic Number for Matrix AI
input double   InpMaxLot        = 1.0;                              // Safety Max Lot Limit
input int      InpSlippage      = 15;                               // Max Slippage (Points)

CTrade trade;
int timerCounter = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpSlippage);
   trade.SetTypeFilling(ORDER_FILLING_FOK);
   
   ulong currentLogin = AccountInfoInteger(ACCOUNT_LOGIN);
   Print("══════════════════════════════════════════════════════");
   Print("🚀 MATRIX 10-Agent Autonomous Bridge started on ", _Symbol);
   Print("👤 MT5 Account Login: ", currentLogin);
   Print("🏦 Broker Server: ", AccountInfoString(ACCOUNT_SERVER), " (", AccountInfoString(ACCOUNT_COMPANY), ")");
   Print("💰 Account Balance: $", DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2));
   
   if(InpTargetAccount > 0 && currentLogin != InpTargetAccount)
   {
      Print("⚠️ تنبيه: الحساب المفتوح حالياً هو ", currentLogin, " بينما الحساب المستهدف في الإعدادات هو ", InpTargetAccount);
   }
   else
   {
      Print("✅ [MATRIX] تم التحقق بنجاح من ربط الحساب التجريبي المخصص: ", InpTargetAccount);
   }

   Print("📡 Cloud Server URL: ", InpServerUrl);
   Print("💡 تذكير: يرجى التأكد من تفعيل Allow WebRequest للرابط أعلاه في Tools -> Options -> Expert Advisors");
   Print("══════════════════════════════════════════════════════");
   
   EventSetTimer(InpPollSeconds);
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("⏹️ MATRIX Bridge stopped.");
}

//+------------------------------------------------------------------+
//| Expert timer function (24/7 background check)                    |
//+------------------------------------------------------------------+
void OnTimer()
{
   FetchAndExecuteCloudSignals();
}

//+------------------------------------------------------------------+
//| Fetch signals from Cloud AI Swarm and Execute                   |
//+------------------------------------------------------------------+
void FetchAndExecuteCloudSignals()
{
   ulong login = AccountInfoInteger(ACCOUNT_LOGIN);
   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   string broker = AccountInfoString(ACCOUNT_COMPANY);

   string url = InpServerUrl + "/api/bot/signals?account=" + IntegerToString(login) +
                "&balance=" + DoubleToString(bal, 2) +
                "&equity=" + DoubleToString(eq, 2) +
                "&broker=" + broker;

   string headers = "Accept: application/json\r\n";
   char post[], result[];
   string resultHeaders;
   
   ResetLastError();
   int res = WebRequest("GET", url, headers, 3000, post, result, resultHeaders);
   
   if(res == 200)
   {
      string jsonResponse = CharArrayToString(result);
      if(StringLen(jsonResponse) > 10 && StringFind(jsonResponse, "\"cmd\"") >= 0)
      {
         ParseAndExecuteJson(jsonResponse);
      }
   }
   else if(res == -1)
   {
      // If WebRequest fails (URL not allowed in MT5 settings), check local file fallback
      CheckLocalFileFallback();
   }
}

//+------------------------------------------------------------------+
//| Fallback: Read matrix_signals.json in MQL5/Files                 |
//+------------------------------------------------------------------+
void CheckLocalFileFallback()
{
   string filename = "matrix_signals.json";
   if(FileIsExist(filename))
   {
      int handle = FileOpen(filename, FILE_READ|FILE_TXT);
      if(handle != INVALID_HANDLE)
      {
         string content = "";
         while(!FileIsEnding(handle))
         {
            content += FileReadString(handle);
         }
         FileClose(handle);
         
         if(StringLen(content) > 10 && StringFind(content, "\"cmd\"") >= 0)
         {
            ParseAndExecuteJson(content);
            FileDelete(filename); // Clean up executed file
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Parse JSON Signal and place Market Order                         |
//+------------------------------------------------------------------+
void ParseAndExecuteJson(string json)
{
   // Extract Symbol
   string sym = ExtractJsonValue(json, "symbol");
   if(sym == "") sym = _Symbol;
   
   // Extract Command (BUY or SELL)
   string cmd = ExtractJsonValue(json, "cmd");
   
   // Extract Lot
   double lot = StringToDouble(ExtractJsonValue(json, "lot"));
   if(lot <= 0) lot = 0.01;
   if(lot > InpMaxLot) lot = InpMaxLot;
   
   // Extract SL / TP
   double sl = StringToDouble(ExtractJsonValue(json, "sl"));
   double tp = StringToDouble(ExtractJsonValue(json, "tp"));
   string comment = ExtractJsonValue(json, "comment");
   if(comment == "") comment = "MATRIX-AI-BOT";
   
   // Execute Trade on MT5
   if(cmd == "BUY")
   {
      double ask = SymbolInfoDouble(sym, SYMBOL_ASK);
      if(ask > 0)
      {
         Print("🎯 MATRIX AI Executing BUY: ", sym, " Lot: ", lot, " SL: ", sl, " TP: ", tp);
         if(trade.Buy(lot, sym, ask, sl, tp, comment))
         {
            Print("✅ BUY Order Placed Successfully! Ticket: ", trade.ResultOrder());
         }
         else
         {
            Print("❌ BUY Execution Failed. Error: ", GetLastError());
         }
      }
   }
   else if(cmd == "SELL")
   {
      double bid = SymbolInfoDouble(sym, SYMBOL_BID);
      if(bid > 0)
      {
         Print("🎯 MATRIX AI Executing SELL: ", sym, " Lot: ", lot, " SL: ", sl, " TP: ", tp);
         if(trade.Sell(lot, sym, bid, sl, tp, comment))
         {
            Print("✅ SELL Order Placed Successfully! Ticket: ", trade.ResultOrder());
         }
         else
         {
            Print("❌ SELL Execution Failed. Error: ", GetLastError());
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Simple JSON value extractor helper                               |
//+------------------------------------------------------------------+
string ExtractJsonValue(string json, string key)
{
   string search = "\"" + key + "\":";
   int start = StringFind(json, search);
   if(start < 0) return "";
   
   start += StringLen(search);
   // skip spaces or quotes
   while(start < StringLen(json) && (StringGetCharacter(json, start) == ' ' || StringGetCharacter(json, start) == '\"'))
      start++;
      
   int end = start;
   while(end < StringLen(json))
   {
      ushort ch = StringGetCharacter(json, end);
      if(ch == '\"' || ch == ',' || ch == '}' || ch == ']')
         break;
      end++;
   }
   
   return StringSubstr(json, start, end - start);
}
//+------------------------------------------------------------------+
