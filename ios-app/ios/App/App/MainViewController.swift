import UIKit
import Capacitor

/// The app's web view controller. Registers the app's own native bridge (CRNativePlugin) next to the npm plugins.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(CRNativePlugin())
    }
}
