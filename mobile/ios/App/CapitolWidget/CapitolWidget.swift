import WidgetKit
import SwiftUI

// Home-screen widget: the latest stock trades reported by the members of Congress you follow
// (or by anyone in Congress, before you follow someone). The app shares who you follow through the App Group;
// the widget reads public records straight from the database every hour, and shows the last copy when offline.

private let appGroup = "group.com.capitolreceipts.app"
private let supabaseURL = "https://hxgckcriehvrolwnabpd.supabase.co"
private let publishableKey = "sb_publishable_jiwF5q1sFMuaGXLKg6FKAQ_3rCjcZ1J" // public by design: read-only public records

struct Trade: Codable, Identifiable, Hashable {
    let key: String
    let member_id: String
    let name: String
    let kind: String?
    let asset: String?
    let ticker: String?
    let lo: Double?
    let hi: Double?
    let tdate: String?
    var id: String { key }

    var verb: String {
        let k = (kind ?? "").lowercased()
        return k.contains("sale") || k.contains("sell") ? "Sold" : k.contains("exchange") ? "Exchanged" : "Bought"
    }
    var what: String {
        if let t = ticker, !t.isEmpty { return t }
        let a = (asset ?? "stock").components(separatedBy: " - ").first ?? "stock"
        return String(a.prefix(22))
    }
    var amount: String {
        func m(_ v: Double) -> String { v >= 1_000_000 ? "$\(Int(v / 1_000_000))M" : v >= 1_000 ? "$\(Int(v / 1_000))K" : "$\(Int(v))" }
        guard let lo = lo, let hi = hi else { return "" }
        return "\(m(lo))–\(m(hi))"
    }
    var shortName: String { name.components(separatedBy: " ").last ?? name }
}

struct Entry: TimelineEntry {
    let date: Date
    let trades: [Trade]
    let following: Bool
    let stale: Bool
}

struct Provider: TimelineProvider {
    private var shared: UserDefaults? { UserDefaults(suiteName: appGroup) }

    func placeholder(in context: Context) -> Entry {
        Entry(date: .now, trades: [
            Trade(key: "1", member_id: "", name: "Sample Member", kind: "Purchase", asset: nil, ticker: "NVDA", lo: 15001, hi: 50000, tdate: nil),
            Trade(key: "2", member_id: "", name: "Another Member", kind: "Sale", asset: nil, ticker: "AAPL", lo: 1001, hi: 15000, tdate: nil),
        ], following: true, stale: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : cached())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let ids = shared?.stringArray(forKey: "follows") ?? []
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: .now) ?? .now.addingTimeInterval(3600)
        fetch(ids: ids) { trades in
            let entry: Entry
            if let trades = trades {
                if let data = try? JSONEncoder().encode(trades) { shared?.set(data, forKey: "lastTrades") }
                entry = Entry(date: .now, trades: trades, following: !ids.isEmpty, stale: false)
            } else {
                entry = cached()
            }
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    private func cached() -> Entry {
        let ids = shared?.stringArray(forKey: "follows") ?? []
        let data = shared?.data(forKey: "lastTrades") ?? shared?.data(forKey: "snapshot")
        let trades = data.flatMap { try? JSONDecoder().decode([Trade].self, from: $0) } ?? []
        return Entry(date: .now, trades: trades, following: !ids.isEmpty, stale: true)
    }

    private func fetch(ids: [String], done: @escaping ([Trade]?) -> Void) {
        var c = URLComponents(string: "\(supabaseURL)/rest/v1/trade_feed")!
        var q = [
            URLQueryItem(name: "select", value: "key,member_id,name,kind,asset,ticker,lo,hi,tdate"),
            URLQueryItem(name: "order", value: "first_seen.desc,tdate.desc"),
            URLQueryItem(name: "limit", value: "6"),
        ]
        let safe = ids.filter { $0.range(of: "^[A-Za-z0-9_-]{1,20}$", options: .regularExpression) != nil }.prefix(200)
        if !safe.isEmpty { q.append(URLQueryItem(name: "member_id", value: "in.(\(safe.joined(separator: ",")))")) }
        c.queryItems = q
        var req = URLRequest(url: c.url!, timeoutInterval: 15)
        req.setValue(publishableKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(publishableKey)", forHTTPHeaderField: "Authorization")
        URLSession.shared.dataTask(with: req) { data, resp, _ in
            guard let data = data, (resp as? HTTPURLResponse)?.statusCode == 200,
                  let trades = try? JSONDecoder().decode([Trade].self, from: data) else { return done(nil) }
            done(trades)
        }.resume()
    }
}

struct CapitolWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: Entry
    private let navy = Color(red: 20 / 255, green: 39 / 255, blue: 78 / 255)
    private let red = Color(red: 200 / 255, green: 50 / 255, blue: 58 / 255)

    var rows: Int { family == .systemSmall ? 2 : family == .systemMedium ? 3 : 6 }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Text("Capitol").font(.caption2.weight(.heavy)).foregroundStyle(.white)
                    .padding(.horizontal, 4).padding(.vertical, 1).background(red, in: RoundedRectangle(cornerRadius: 3))
                Text(entry.following ? "Trades you follow" : "Latest trades").font(.caption.weight(.bold)).foregroundStyle(.white.opacity(0.9))
                    .lineLimit(1)
            }
            if entry.trades.isEmpty {
                Spacer()
                Text(entry.following ? "No trades yet from the people you follow." : "Open the app to load the latest trades.")
                    .font(.caption).foregroundStyle(.white.opacity(0.85))
                Spacer()
            } else {
                ForEach(entry.trades.prefix(rows)) { t in
                    Link(destination: URL(string: "https://app.capitolreceipts.com/member/\(t.member_id)?app=1")!) {
                        VStack(alignment: .leading, spacing: 1) {
                            Text(t.shortName).font(.caption.weight(.semibold)).foregroundStyle(.white).lineLimit(1)
                            Text("\(t.verb) \(t.what) · \(t.amount)").font(.caption2).foregroundStyle(.white.opacity(0.8)).lineLimit(1)
                        }
                    }
                }
                Spacer(minLength: 0)
            }
            if entry.stale { Text("Offline · last saved copy").font(.system(size: 9)).foregroundStyle(.white.opacity(0.6)) }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .containerBackground(navy, for: .widget)
        .widgetURL(URL(string: "https://app.capitolreceipts.com/?go=radar"))
    }
}

@main
struct CapitolWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "CapitolWidget", provider: Provider()) { entry in
            CapitolWidgetView(entry: entry)
        }
        .configurationDisplayName("Congress trades")
        .description("The latest stock trades by the members of Congress you follow.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
