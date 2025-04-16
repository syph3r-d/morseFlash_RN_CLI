package com.morseflash_rn_cli

import android.content.Context
import android.hardware.camera2.CameraManager
import com.facebook.react.bridge.ReactApplicationContext
import com.morseflash_rn_cli.NativeFlashlightSpec

class NativeFlashlightModule(reactContext: ReactApplicationContext) : NativeFlashlightSpec(reactContext) {

  companion object {
    const val NAME = "NativeFlashlight"
  }

  override fun getName(): String {
    return NAME
  }

  override fun turnOn() {
    toggleFlashlight(true)
  }

  override fun turnOff() {
    toggleFlashlight(false)
  }

  private fun toggleFlashlight(state: Boolean) {
    val cameraManager = reactApplicationContext.getSystemService(Context.CAMERA_SERVICE) as CameraManager
    val cameraId = cameraManager.cameraIdList.firstOrNull()
    cameraId?.let {
      try {
        cameraManager.setTorchMode(it, state)
      } catch (e: Exception) {
        e.printStackTrace()
      }
    }
  }
}
