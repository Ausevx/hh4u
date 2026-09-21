package com.healinghands4u.presentation.common

import android.content.Context
import android.content.ContextWrapper
import dagger.hilt.internal.GeneratedComponent
import dagger.hilt.internal.GeneratedComponentManager
import dagger.hilt.internal.GeneratedComponentManagerHolder

fun isHiltAvailable(context: Context): Boolean {
    var ctx: Context? = context
    while (ctx != null) {
        if (ctx is GeneratedComponentManager<*> ||
            ctx is GeneratedComponentManagerHolder ||
            ctx is GeneratedComponent
        ) {
            return true
        }
        ctx = if (ctx is ContextWrapper) ctx.baseContext else null
    }
    return false
}
