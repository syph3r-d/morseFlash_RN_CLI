package com.morseflash_rn_cli

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class NativeFlashlightPackage : BaseReactPackage() {

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == NativeFlashlightModule.NAME) {
      NativeFlashlightModule(reactContext)
    } else null
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      mapOf(
        NativeFlashlightModule.NAME to ReactModuleInfo(
          NativeFlashlightModule.NAME,
          NativeFlashlightModule.NAME,
          false,
          false,
          false,
          true // isTurboModule
        )
      )
    }
  }
}
