import Foundation
import Capacitor
import LocalAuthentication
import WidgetKit

/// Small native bridge for Capitol Receipts, available to the web app as `Capacitor.Plugins.CRNative`.
/// - setWidgetData: shares who the person follows with the home-screen widget (App Group), then refreshes it.
/// - biometricStatus / authenticate: Face ID or Touch ID for the optional app lock.
@objc(CRNativePlugin)
public class CRNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CRNativePlugin"
    public let jsName = "CRNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setWidgetData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "biometricStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
    ]

    static let appGroup = "group.com.capitolreceipts.app"

    @objc func setWidgetData(_ call: CAPPluginCall) {
        guard let shared = UserDefaults(suiteName: CRNativePlugin.appGroup) else {
            call.reject("App Group not available")
            return
        }
        // follows: [{ id, name }]; snapshot: [{ member_id, name, kind, asset, ticker, lo, hi, tdate }] (optional, shown offline)
        let follows = call.getArray("follows", JSObject.self) ?? []
        let ids = follows.compactMap { $0["id"] as? String }
        var names: [String: String] = [:]
        for f in follows { if let id = f["id"] as? String, let n = f["name"] as? String { names[id] = n } }
        shared.set(ids, forKey: "follows")
        shared.set(names, forKey: "followNames")
        if let snap = call.getArray("snapshot"), let data = try? JSONSerialization.data(withJSONObject: snap) {
            shared.set(data, forKey: "snapshot")
        }
        shared.set(call.getBool("signedIn") ?? false, forKey: "signedIn")
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func biometricStatus(_ call: CAPPluginCall) {
        let ctx = LAContext()
        var err: NSError?
        let ok = ctx.canEvaluatePolicy(.deviceOwnerAuthentication, error: &err)
        let kind: String
        switch ctx.biometryType {
        case .faceID: kind = "faceID"
        case .touchID: kind = "touchID"
        default: kind = ok ? "passcode" : "none"
        }
        call.resolve(["available": ok, "type": kind])
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        let ctx = LAContext()
        ctx.localizedCancelTitle = "Cancel"
        let reason = call.getString("reason") ?? "Unlock Capitol Receipts"
        // deviceOwnerAuthentication falls back to the passcode, so nobody is locked out if Face ID fails
        ctx.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { ok, error in
            DispatchQueue.main.async {
                if ok { call.resolve(["ok": true]) }
                else { call.resolve(["ok": false, "error": (error as NSError?)?.localizedDescription ?? "cancelled"]) }
            }
        }
    }
}
