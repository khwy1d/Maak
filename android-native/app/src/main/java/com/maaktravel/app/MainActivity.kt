package com.maaktravel.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.net.URLEncoder
import kotlinx.coroutines.launch
import org.json.JSONObject
import org.json.JSONArray
import java.util.UUID

private val Teal = Color(0xFF20B8A6)
private val Navy = Color(0xFF142C4E)
private val Gold = Color(0xFFF5B52E)
private val Pale = Color(0xFFF5F7FA)

private data class Service(val key: String, val ar: String, val en: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)
private val services = listOf(
    Service("flight", "تذاكر الطيران", "Flight tickets", Icons.Default.Flight),
    Service("hotel", "حجوزات الفنادق", "Hotel reservations", Icons.Default.Hotel),
    Service("bus", "النقل البري", "Ground transport", Icons.Default.DirectionsBus),
    Service("car", "تأجير السيارات", "Car rental", Icons.Default.DirectionsCar),
    Service("security", "موافقات مصر", "Egypt approvals", Icons.Default.VerifiedUser),
    Service("umrah", "العمرة", "Umrah", Icons.Default.Mosque),
    Service("medical", "السفر العلاجي", "Medical travel", Icons.Default.LocalHospital),
)
private data class FieldSpec(val key:String,val ar:String,val en:String,val options:List<String> = emptyList(),val multi:Boolean=false)
private fun fieldGroups(key:String): List<Pair<String,List<FieldSpec>>> {
    fun f(k:String,a:String,e:String,o:List<String> = emptyList(),m:Boolean=false)=FieldSpec(k,a,e,o,m)
    fun o(vararg s:String)=s.toList()
    return when(key) {
        "flight" -> listOf(
            "تفاصيل الرحلة" to listOf(f("trip","نوع الرحلة","Trip type",o("ذهاب فقط / One way","ذهاب وعودة / Round trip")),f("fromCity","مدينة المغادرة","Departure city",o("عدن / Aden","سيئون / Seiyun","المكلا / Mukalla","سقطرى / Socotra","جدة / Jeddah","الرياض / Riyadh","القاهرة / Cairo","عمّان / Amman","دبي / Dubai","إسطنبول / Istanbul","أخرى / Other")),f("toCity","مدينة الوصول","Arrival city",o("عدن / Aden","سيئون / Seiyun","المكلا / Mukalla","سقطرى / Socotra","جدة / Jeddah","الرياض / Riyadh","القاهرة / Cairo","عمّان / Amman","دبي / Dubai","إسطنبول / Istanbul","أخرى / Other")),f("date","تاريخ الذهاب","Departure date"),f("returnDate","تاريخ العودة","Return date")),
            "المسافرون" to listOf(f("adults","بالغون (12 سنة فأكثر)","Adults (12 years and over)",o("1","2","3","4","5","6","7","8","9")),f("children","أطفال (2–11 سنة)","Children (2–11 years)",o("0","1","2","3","4","5")),f("infants","رضّع (أقل من سنتين)","Infants (under 2 years)",o("0","1","2","3"))),
            "التفضيلات والتواصل" to listOf(f("airline","شركة الطيران المفضلة","Airline preference",o("بدون تفضيل / No preference","اليمنية / Yemenia","عدن فلاي / Aden Fly")),f("name","الاسم","Name"),f("phone","رقم واتساب","WhatsApp number"),f("notes","ملاحظات إضافية","Additional notes",m=true))
        )
        "hotel" -> listOf(
            "مكان الإقامة" to listOf(f("country","الدولة","Country"),f("city","المدينة","City"),f("area","الحي أو المنطقة","Area")),
            "تفاصيل الإقامة" to listOf(f("stayType","نوع السكن","Accommodation type",o("فندق / Hotel","شقة / Apartment","منتجع / Resort","أخرى / Other")),f("checkIn","تاريخ الوصول","Check-in"),f("checkOut","تاريخ المغادرة","Check-out"),f("guests","عدد الأشخاص","Guests",o("1","2","3","4","5+")),f("rooms","عدد الغرف","Rooms",o("1","2","3","4+")),f("stars","تصنيف الفندق","Hotel stars",o("أي تصنيف / Any","3 نجوم / 3 stars","4 نجوم / 4 stars","5 نجوم / 5 stars")),f("notes","تفاصيل إضافية","Additional details",m=true))
        )
        "car" -> listOf("تفاصيل السيارة" to listOf(f("country","الدولة","Country",o("اليمن / Yemen","السعودية / Saudi Arabia","مصر / Egypt")),f("city","مدينة الاستلام","Pickup city"),f("pickup","مكان الاستلام","Pickup location"),f("dropoff","مكان التسليم","Return location"),f("startDate","تاريخ الاستلام","Pickup date"),f("endDate","تاريخ التسليم","Return date"),f("carType","نوع السيارة","Vehicle type",o("اقتصادية / Economy","سيدان / Sedan","دفع رباعي / SUV","عائلية / Family")),f("notes","تفاصيل إضافية","Additional details",m=true)))
        "bus" -> listOf("المسار والسفر" to listOf(f("from","مدينة الانطلاق","Departure city"),f("to","الوجهة","Destination"),f("date","تاريخ السفر","Travel date"),f("travellers","عدد المسافرين","Travellers",o("1","2","3","4","5+")),f("luggage","الأمتعة","Luggage details",m=true),f("notes","ملاحظات","Notes",m=true)))
        "security" -> listOf("تفاصيل الاستفسار" to listOf(f("stage","مرحلة الطلب","Request stage",o("استفسار جديد / New enquiry","متابعة طلب سابق / Follow-up")),f("purpose","غرض السفر","Travel purpose",o("زيارة أو سياحة / Visit or tourism","زيارة عائلية / Family visit","عمل / Business","عبور / Transit","آخر / Other")),f("city","مدينة المغادرة","Departure city"),f("date","موعد السفر المتوقع","Expected travel date"),f("travellers","عدد المسافرين","Travellers",o("1","2","3","4","5+")),f("documents","هل مستندات السفر جاهزة؟","Are travel documents ready?",o("نعم / Yes","بعضها / Some","ليس بعد / Not yet")),f("question","سؤالك (لا تذكر رقم جواز السفر)","Your question (do not include passport numbers)",m=true)))
        "umrah" -> listOf("رحلة العمرة" to listOf(f("city","مدينة الانطلاق","Departure city"),f("date","موعد السفر المفضل","Preferred travel date"),f("travellers","عدد المسافرين","Travellers",o("1","2","3","4","5+")),f("rooms","عدد الغرف","Rooms",o("1","2","3","4+")),f("stay","تفضيل السكن","Accommodation",o("قريب من الحرم / Near Haram","فندق عائلي / Family hotel","مرن / Flexible")),f("transport","التنقلات","Transport",o("من وإلى المطار / Airport transfers","بين المدن / Intercity","كلاهما / Both","لا أحتاج / Not needed"))))
        "medical" -> listOf("تفاصيل السفر العلاجي" to listOf(f("destination","الوجهة أو الدولة","Destination / country"),f("departure","مدينة الانطلاق","Departure city"),f("date","موعد السفر المتوقع","Expected travel date"),f("travellers","عدد المسافرين","Travellers"),f("accommodation","هل تحتاج إلى سكن؟","Accommodation needed?",o("نعم / Yes","لا / No","غير متأكد / Unsure")),f("transport","هل تحتاج إلى نقل؟","Transport needed?",o("نعم / Yes","لا / No","غير متأكد / Unsure")),f("notes","ملاحظات عامة (لا تكتب بيانات طبية حساسة)","General notes (no sensitive medical details)",m=true)))
        "realEstate" -> listOf("العقار والموقع" to listOf(f("service","نوع الخدمة","Service",o("استئجار / Rent","شراء / Buy","بيع / Sell","إدارة عقار / Property management")),f("city","المدينة","City"),f("area","الحي أو المنطقة","Area"),f("property","نوع العقار","Property type",o("شقة / Apartment","منزل أو فيلا / House or villa","أرض / Land","عقار تجاري / Commercial")),f("rooms","عدد غرف النوم","Bedrooms"),f("budget","الميزانية والعملة","Budget and currency"),f("timing","التوقيت المتوقع","Expected timing",o("قريبًا / Soon","خلال شهر / Within a month","مرن / Flexible")),f("details","تفاصيل إضافية","Additional details",m=true)))
        else -> listOf(
            "تفاصيل الرحلة" to listOf(f("style","طبيعة الرحلة","Trip style",o("عائلية / Family","ثقافية / Cultural","طبيعة ومغامرة / Nature & adventure","استجمام / Relaxation","مخصصة / Custom")),f("destination","الوجهة أو الوجهات","Destination(s)"),f("departure","مدينة الانطلاق","Departure city")),
            "المدة والميزانية" to listOf(f("date","تاريخ البداية المتوقع","Expected start date"),f("duration","مدة الرحلة","Duration",o("2–3 أيام / 2–3 days","أسبوع / One week","أكثر من أسبوع / Over one week","مرنة / Flexible")),f("travellers","عدد المسافرين","Travellers"),f("budget","الميزانية التقريبية","Approximate budget")),
            "الخدمات والتفاصيل" to listOf(f("services","الخدمات المطلوبة","Services needed",o("تنقلات / Transport","إقامة / Accommodation","أنشطة وجولات / Activities","تنسيق كامل / Full coordination")),f("notes","تفاصيل إضافية","Additional details",m=true))
        )
    }
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MAAKApp { message ->
            val uri = Uri.parse("https://wa.me/967776002190?text=" + URLEncoder.encode(message,"UTF-8"))
            startActivity(Intent(Intent.ACTION_VIEW,uri))
        } }
    }
}

@Composable
private fun MAAKApp(onWhatsApp:(String)->Unit) {
    var lang by remember { mutableStateOf("ar") }
    var dark by remember { mutableStateOf(false) }
    var tab by remember { mutableStateOf("home") }
    var selected by remember { mutableStateOf<Service?>(null) }
    var pendingInquiry by remember { mutableStateOf<Pair<String, String>?>(null) }
    var pendingRequestData by remember { mutableStateOf("{}") }
    var pendingOrderId by remember { mutableStateOf<UUID?>(null) }
    var contactName by remember { mutableStateOf("") }
    var contactPhone by remember { mutableStateOf("") }
    var inquiryError by remember { mutableStateOf("") }
    var savingInquiry by remember { mutableStateOf(false) }
    var pendingReceipt by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val ar=lang=="ar"; val bg=if(dark) Color(0xFF101B2A) else Pale
    val surface=if(dark) Color(0xFF1A2A3E) else Color.White
    val text=if(dark) Color(0xFFF2F5F9) else Navy
    val muted=if(dark) Color(0xFFB7C5D7) else Color(0xFF59697D)
    CompositionLocalProvider(LocalLayoutDirection provides if(ar) LayoutDirection.Rtl else LayoutDirection.Ltr) {
        MaterialTheme(colorScheme=if(dark) darkColorScheme(primary=Teal,secondary=Gold,background=bg,surface=surface,onSurface=text) else lightColorScheme(primary=Teal,secondary=Gold,background=bg,surface=surface,onSurface=text)) {
            Scaffold(containerColor=bg,bottomBar={
                if(selected==null && pendingInquiry==null) NavigationBar(containerColor=surface) {
                    NavigationBarItem(selected=tab=="home",onClick={tab="home"},icon={Icon(Icons.Default.Home,null,tint=if(tab=="home") Gold else muted)},label={Text(if(ar) "الرئيسية" else "Home",color=if(tab=="home") Gold else muted)},colors=NavigationBarItemDefaults.colors(indicatorColor=Gold.copy(alpha=.16f)))
                    NavigationBarItem(selected=tab=="orders",onClick={tab="orders"},icon={Icon(Icons.Default.CalendarMonth,null,tint=if(tab=="orders") Gold else muted)},label={Text(if(ar) "حجوزاتي" else "My bookings",color=if(tab=="orders") Gold else muted)},colors=NavigationBarItemDefaults.colors(indicatorColor=Gold.copy(alpha=.16f)))
                    NavigationBarItem(selected=tab=="rewards",onClick={tab="rewards"},icon={Icon(Icons.Default.CardGiftcard,null,tint=if(tab=="rewards") Gold else muted)},label={Text(if(ar) "المكافآت" else "Rewards",color=if(tab=="rewards") Gold else muted)},colors=NavigationBarItemDefaults.colors(indicatorColor=Gold.copy(alpha=.16f)))
                    NavigationBarItem(selected=tab=="account",onClick={tab="account"},icon={Icon(Icons.Default.Person,null,tint=if(tab=="account") Gold else muted)},label={Text(if(ar) "حسابي" else "My account",color=if(tab=="account") Gold else muted)},colors=NavigationBarItemDefaults.colors(indicatorColor=Gold.copy(alpha=.16f)))
                }
            }) { padding ->
                when {
                    selected!=null -> ServiceFormScreen(selected!!,ar,text,muted,surface,Modifier.padding(padding),{selected=null}) { message, requestData ->
                        pendingInquiry = selected!!.key to message
                        pendingRequestData = requestData
                        pendingOrderId = UUID.randomUUID()
                        inquiryError = ""
                    }
                    tab=="home" -> HomeScreen(ar,text,muted,surface,Modifier.padding(padding),{tab="orders"},{tab="account"},{selected=it},{tab="notifications"})
                    tab=="orders" -> OrdersScreen(ar,text,muted,surface,Modifier.padding(padding))
                    tab=="rewards" -> RewardsScreen(ar,text,muted,surface,Modifier.padding(padding))
                    tab=="notifications" -> SectionPlaceholder(if(ar) "الإشعارات" else "Notifications",if(ar) "لا توجد إشعارات للعرض الآن." else "There are no notifications to show yet.",ar,text,muted,Modifier.padding(padding))
                    else -> AccountScreen(ar,dark,text,muted,surface,Modifier.padding(padding),{lang=if(ar) "en" else "ar"},{dark=!dark})
                }
            }
            pendingInquiry?.let { (serviceKey, message) ->
                AlertDialog(
                    onDismissRequest = { if (!savingInquiry) { pendingInquiry = null; pendingOrderId = null } },
                    title = { Text(if (ar) "بيانات التواصل وحفظ الطلب" else "Contact details and save request") },
                    text = {
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text(if (ar) "سنحفظ استفسارك في نظام معك قبل فتح واتساب. هذا ليس تأكيدًا للحجز." else "We will save your enquiry to MAAK before opening WhatsApp. This does not confirm a booking.")
                            if (SupabaseBackend.isConfigured) {
                                OutlinedTextField(value = contactName, onValueChange = { contactName = it }, label = { Text(if (ar) "الاسم" else "Name") }, singleLine = true)
                                OutlinedTextField(value = contactPhone, onValueChange = { contactPhone = it }, label = { Text(if (ar) "رقم الهاتف" else "Phone number") }, singleLine = true)
                            } else {
                                Text(if (ar) "حفظ الطلب غير مهيأ في هذا الإصدار. يمكنك المتابعة إلى واتساب دون حفظه." else "Order saving is not configured in this build. You can continue to WhatsApp without saving.")
                            }
                            if (inquiryError.isNotBlank()) Text(inquiryError, color = MaterialTheme.colorScheme.error)
                        }
                    },
                    confirmButton = {
                        TextButton(enabled = !savingInquiry, onClick = {
                            if (!SupabaseBackend.isConfigured) {
                                pendingInquiry = null
                                pendingOrderId = null
                                onWhatsApp(message)
                            } else if (!savingInquiry) {
                                savingInquiry = true
                                inquiryError = ""
                                scope.launch {
                                    try {
                                        val service = when (serviceKey) {
                                            "bus" -> "ground_transport"
                                            "hotel" -> "accommodation"
                                            "car" -> "car_rental"
                                            "medical" -> "medical_travel"
                                            "security" -> "security_clearance"
                                            "realEstate" -> "real_estate"
                                            else -> serviceKey
                                        }
                                        val response = SupabaseBackend.createGuestOrder(
                                            customerName = contactName,
                                            customerPhone = contactPhone,
                                            service = service,
                                            requestData = JSONObject(pendingRequestData).put("message", message),
                                            idempotencyKey = pendingOrderId ?: UUID.randomUUID(),
                                        )
                                        pendingReceipt = extractOrderId(response)
                                        pendingInquiry = null
                                        pendingOrderId = null
                                        contactName = ""
                                        contactPhone = ""
                                        onWhatsApp(message)
                                    } catch (error: Exception) {
                                        inquiryError = error.message ?: if (ar) "تعذر حفظ الطلب. تحقق من الاتصال وحاول مرة أخرى." else "Could not save the request. Check your connection and try again."
                                    } finally {
                                        savingInquiry = false
                                    }
                                }
                            }
                        }) { Text(if (savingInquiry) (if (ar) "جارٍ الحفظ…" else "Saving…") else if (SupabaseBackend.isConfigured) (if (ar) "حفظ والمتابعة" else "Save and continue") else (if (ar) "المتابعة إلى واتساب" else "Continue to WhatsApp")) }
                    },
                    dismissButton = { TextButton(enabled = !savingInquiry, onClick = { pendingInquiry = null; pendingOrderId = null }) { Text(if (ar) "إلغاء" else "Cancel") } },
                )
            }
            pendingReceipt?.let { orderId ->
                AlertDialog(
                    onDismissRequest = { pendingReceipt = null },
                    title = { Text(if (ar) "تم استلام طلبك" else "Request received") },
                    text = { Text(if (ar) "رقم الطلب: $orderId\nالطلب قيد المراجعة، وليس حجزًا مؤكدًا." else "Request number: $orderId\nYour request is under review, not a confirmed booking.") },
                    confirmButton = { TextButton(onClick = { pendingReceipt = null }) { Text(if (ar) "حسنًا" else "Done") } },
                )
            }
        }
    }
}

private fun extractOrderId(response: String): String? = try {
    val trimmed = response.trim()
    val row = if (trimmed.startsWith("[")) JSONArray(trimmed).optJSONObject(0) else JSONObject(trimmed)
    row?.optString("id")?.takeIf { !it.isNullOrBlank() && it != "null" }
} catch (_: Exception) {
    null
}

@Composable
private fun HomeScreen(ar:Boolean,text:Color,muted:Color,surface:Color,modifier:Modifier,onTrackGuest:()->Unit,onAccount:()->Unit,onChoose:(Service)->Unit,onNotifications:()->Unit) {
    LazyVerticalGrid(columns=GridCells.Fixed(3),modifier=modifier.fillMaxSize(),contentPadding=PaddingValues(18.dp),verticalArrangement=Arrangement.spacedBy(12.dp),horizontalArrangement=Arrangement.spacedBy(10.dp)) {
        item(span={GridItemSpan(maxLineSpan)}) { Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(10.dp)) {
            Surface(Modifier.size(44.dp).clickable(onClick=onAccount),shape=RoundedCornerShape(50),color=Teal.copy(alpha=.10f)) {
                Box(contentAlignment=Alignment.Center) { Icon(Icons.Default.Person,null,tint=Teal,modifier=Modifier.size(25.dp)) }
            }
            Column(Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(2.dp)) {
                Text(if(ar) "مرحبًا بك" else "Welcome",fontSize=17.sp,fontWeight=FontWeight.Bold,color=text)
                Text(if(ar) "دائمًا معك" else "Always with you",color=muted,fontSize=12.sp)
            }
            IconButton(onClick=onNotifications){Icon(Icons.Default.Notifications,null,tint=Navy)}
        } }
        item(span={GridItemSpan(maxLineSpan)}) { Card(colors=CardDefaults.cardColors(containerColor=Color.Transparent),shape=RoundedCornerShape(24.dp)) {
            Column(Modifier.fillMaxWidth().heightIn(min=142.dp).background(Brush.horizontalGradient(listOf(Teal,Color(0xFF143D80))),RoundedCornerShape(24.dp)).padding(vertical=16.dp,horizontal=20.dp),verticalArrangement=Arrangement.spacedBy(7.dp),horizontalAlignment=Alignment.CenterHorizontally) {
                Image(painterResource(R.drawable.maak_logo),contentDescription=if(ar) "شعار معك" else "MAAK logo",modifier=Modifier.size(55.dp))
                Text(if(ar) "سفرك أسهل معنا" else "Travel made easier",fontSize=21.sp,lineHeight=27.sp,fontWeight=FontWeight.Bold,color=Color.White)
                Text(if(ar) "معك في كل خطوة من رحلتك" else "With you at every step",color=Color.White.copy(alpha=.9f),fontSize=13.sp)
            }
        } }
        item(span={GridItemSpan(maxLineSpan)}) { Column(verticalArrangement=Arrangement.spacedBy(3.dp)) {
            Text(if(ar) "خدماتنا" else "Our services",fontSize=21.sp,fontWeight=FontWeight.Bold,color=text)
            Text(if(ar) "اختر الخدمة المناسبة لرحلتك" else "Choose the service you need",fontSize=12.sp,color=muted)
        } }
        gridItems(services){ service -> ServiceCard(service,ar,text,muted,surface){onChoose(service)} }
        item(span={GridItemSpan(maxLineSpan)}) { Text(if(ar) "طلباتك استفسارات قيد المراجعة وليست حجوزات مؤكدة." else "Requests are enquiries under review, not confirmed bookings.",color=muted,fontSize=12.sp,lineHeight=19.sp) }
    }
}

@Composable
private fun SectionPlaceholder(title:String,message:String,ar:Boolean,text:Color,muted:Color,modifier:Modifier,onToggleLanguage:(()->Unit)?=null,onToggleTheme:(()->Unit)?=null) {
    Column(modifier.fillMaxSize().padding(20.dp),verticalArrangement=Arrangement.spacedBy(16.dp)) {
        Text(title,fontSize=24.sp,fontWeight=FontWeight.Bold,color=text)
        Card(Modifier.fillMaxWidth(),colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.surface),shape=RoundedCornerShape(22.dp)) {
            Column(Modifier.fillMaxWidth().padding(22.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(12.dp)) {
                Box(Modifier.size(68.dp).background(Teal.copy(alpha=.12f),RoundedCornerShape(22.dp)),contentAlignment=Alignment.Center) { Icon(Icons.Default.NotificationsNone,null,tint=Teal,modifier=Modifier.size(34.dp)) }
                Text(message,color=muted,fontSize=14.sp,lineHeight=22.sp)
            }
        }
        if(onToggleLanguage!=null) SettingsRow(if(ar) "اللغة" else "Language",if(ar) "العربية" else "English",Icons.Default.Language,onToggleLanguage,text,muted,MaterialTheme.colorScheme.surface)
        if(onToggleTheme!=null) SettingsRow(if(ar) "المظهر" else "Appearance",if(ar) "فاتح / داكن" else "Light / dark",Icons.Default.DarkMode,onToggleTheme,text,muted,MaterialTheme.colorScheme.surface)
    }
}

@Composable
private fun OrdersScreen(ar:Boolean,text:Color,muted:Color,surface:Color,modifier:Modifier) {
    var selectedFilter by remember { mutableIntStateOf(0) }
    Column(modifier.fillMaxSize().padding(18.dp),verticalArrangement=Arrangement.spacedBy(16.dp)) {
        Text(if(ar) "حجوزاتي" else "My bookings",fontSize=24.sp,fontWeight=FontWeight.Bold,color=text)
        Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
            listOf(if(ar) "الكل" else "All",if(ar) "النشطة" else "Active",if(ar) "المكتملة" else "Completed",if(ar) "الملغاة" else "Cancelled").forEachIndexed { index,label ->
                Surface(modifier=Modifier.clickable { selectedFilter=index },shape=RoundedCornerShape(50),color=if(index==selectedFilter) Gold else surface) { Text(label,Modifier.padding(horizontal=12.dp,vertical=9.dp),color=if(index==selectedFilter) Navy else muted,fontSize=12.sp,fontWeight=FontWeight.SemiBold) }
            }
        }
        Card(Modifier.fillMaxWidth(),colors=CardDefaults.cardColors(containerColor=surface),shape=RoundedCornerShape(22.dp)) {
            Column(Modifier.fillMaxWidth().padding(24.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(12.dp)) {
                Icon(Icons.Default.Luggage,null,tint=Teal,modifier=Modifier.size(48.dp))
                Text(if(ar) "تظهر طلباتك هنا" else "Your requests will appear here",fontSize=17.sp,fontWeight=FontWeight.Bold,color=text)
                Text(if(ar) "تصفّح كضيف متاح. سجّل الدخول لربط طلباتك بحسابك ومتابعتها هنا." else "Guest browsing is available. Sign in to link and follow your requests here.",color=muted,fontSize=13.sp,lineHeight=20.sp)
            }
        }
    }
}

@Composable
private fun RewardsScreen(ar:Boolean,text:Color,muted:Color,surface:Color,modifier:Modifier) {
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(18.dp),verticalArrangement=Arrangement.spacedBy(14.dp)) {
        Text(if(ar) "المكافآت" else "Rewards",fontSize=24.sp,fontWeight=FontWeight.Bold,color=text)
        Card(Modifier.fillMaxWidth(),shape=RoundedCornerShape(24.dp),colors=CardDefaults.cardColors(containerColor=Teal)) {
            Column(Modifier.fillMaxWidth().padding(22.dp),verticalArrangement=Arrangement.spacedBy(14.dp),horizontalAlignment=Alignment.End) {
                Text(if(ar) "رصيد المكافآت" else "Rewards balance",color=Color.White.copy(alpha=.9f),fontSize=13.sp)
                Text("—",fontSize=38.sp,fontWeight=FontWeight.Bold,color=Color.White)
                Text(if(ar) "يظهر الرصيد بعد تسجيل الدخول" else "Sign in to view your balance",color=Color.White,fontSize=12.sp)
            }
        }
        Card(Modifier.fillMaxWidth(),colors=CardDefaults.cardColors(containerColor=surface),shape=RoundedCornerShape(20.dp)) {
            Row(Modifier.padding(18.dp),horizontalArrangement=Arrangement.spacedBy(14.dp),verticalAlignment=Alignment.CenterVertically) {
                Icon(Icons.Default.CardGiftcard,null,tint=Gold,modifier=Modifier.size(32.dp))
                Column(verticalArrangement=Arrangement.spacedBy(4.dp)) {
                    Text(if(ar) "ادعُ أصدقاءك" else "Invite your friends",fontWeight=FontWeight.Bold,color=text)
                    Text(if(ar) "سجّل الدخول لعرض كود الإحالة ومكافآتك." else "Sign in to view your referral code and rewards.",color=muted,fontSize=13.sp,lineHeight=20.sp)
                }
            }
        }
        if (SupabaseBackend.isConfigured) {
            Card(Modifier.fillMaxWidth(),colors=CardDefaults.cardColors(containerColor=surface),shape=RoundedCornerShape(20.dp)) {
                Row(Modifier.fillMaxWidth().padding(18.dp),horizontalArrangement=Arrangement.spacedBy(14.dp),verticalAlignment=Alignment.CenterVertically) {
                    Icon(Icons.Default.CardGiftcard,null,tint=Gold,modifier=Modifier.size(32.dp))
                    Column(Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(4.dp)) {
                        Text(if(ar) "كود الإحالة" else "Referral code",fontWeight=FontWeight.Bold,color=text)
                        Text(if(ar) "سجّل الدخول لعرض كودك ومشاركته." else "Sign in to view and share your code.",color=muted,fontSize=13.sp,lineHeight=20.sp)
                    }
                }
            }
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(10.dp)) {
                listOf(if(ar) "الإحالات" else "Referrals",if(ar) "المكتسبة" else "Earned").forEach { label ->
                    Card(Modifier.weight(1f),colors=CardDefaults.cardColors(containerColor=surface),shape=RoundedCornerShape(18.dp)) {
                        Column(Modifier.padding(14.dp),verticalArrangement=Arrangement.spacedBy(6.dp)) { Text(label,color=muted,fontSize=12.sp);Text("—",color=text,fontSize=20.sp,fontWeight=FontWeight.Bold) }
                    }
                }
            }
        }
        Text(if(ar) "سجل الحركات" else "Activity",fontSize=18.sp,fontWeight=FontWeight.Bold,color=text)
        Text(if(ar) "ستظهر الحركات هنا عند توفرها في حسابك." else "Your activity will appear here when available.",fontSize=13.sp,color=muted)
    }
}

@Composable
private fun AccountScreen(ar:Boolean,dark:Boolean,text:Color,muted:Color,surface:Color,modifier:Modifier,onToggleLanguage:()->Unit,onToggleTheme:()->Unit) {
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(18.dp),verticalArrangement=Arrangement.spacedBy(14.dp)) {
        Text(if(ar) "حسابي" else "My account",fontSize=24.sp,fontWeight=FontWeight.Bold,color=text)
        Card(Modifier.fillMaxWidth(),colors=CardDefaults.cardColors(containerColor=surface),shape=RoundedCornerShape(18.dp)) {
            Row(Modifier.fillMaxWidth().padding(12.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)) {
                Box(Modifier.size(48.dp).background(Teal.copy(alpha=.12f),RoundedCornerShape(50)),contentAlignment=Alignment.Center) { Icon(Icons.Default.Person,null,tint=Teal,modifier=Modifier.size(27.dp)) }
                Column(verticalArrangement=Arrangement.spacedBy(4.dp)) {
                    Text(if(ar) "زائر معك" else "MAAK guest",fontWeight=FontWeight.Bold,color=text,fontSize=17.sp)
                    Text(if(ar) "سجّل الدخول لإدارة ملفك وطلباتك" else "Sign in to manage your profile and requests",color=muted,fontSize=12.sp,lineHeight=18.sp)
                }
            }
        }
        Text(if(ar) "التطبيق" else "App",fontSize=17.sp,fontWeight=FontWeight.Bold,color=text)
        SettingsRow(if(ar) "اللغة" else "Language",if(ar) "العربية / English" else "English / العربية",Icons.Default.Language,onToggleLanguage,text,muted,surface)
        SettingsRow(if(ar) "المظهر" else "Appearance",if(dark) (if(ar) "داكن" else "Dark") else (if(ar) "فاتح" else "Light"),Icons.Default.DarkMode,onToggleTheme,text,muted,surface)
        SettingsRow(if(ar) "الملف الشخصي" else "Profile",if(ar) "البيانات الشخصية والوثائق" else "Personal details and documents",Icons.Default.Badge,null,text,muted,surface)
        SettingsRow(if(ar) "إعدادات الحساب" else "Account settings",if(ar) "تغيير الهاتف وكلمة المرور" else "Change phone and password",Icons.Default.ManageAccounts,null,text,muted,surface)
        SettingsRow(if(ar) "الإشعارات" else "Notifications",if(ar) "إعدادات الإشعارات" else "Notification settings",Icons.Default.Notifications,null,text,muted,surface)
        SettingsRow(if(ar) "الخصوصية والشروط" else "Privacy and terms",if(ar) "سياسة الخصوصية وشروط الاستخدام" else "Privacy policy and terms of use",Icons.Default.Policy,null,text,muted,surface)
        SettingsRow(if(ar) "عن معك" else "About MAAK",if(ar) "خدمات السفر، دائمًا معك" else "Travel services, always with you",Icons.Default.Info,null,text,muted,surface)
        SettingsRow(if(ar) "تسجيل الخروج" else "Sign out",if(ar) "الخروج من حسابك" else "Sign out of your account",Icons.Default.Logout,null,text,muted,surface)
    }
}

@Composable
private fun SettingsRow(title:String,subtitle:String,icon:androidx.compose.ui.graphics.vector.ImageVector,onClick:(()->Unit)?,text:Color,muted:Color,surface:Color) {
    Card(Modifier.fillMaxWidth().then(if(onClick!=null) Modifier.clickable(onClick=onClick) else Modifier),colors=CardDefaults.cardColors(containerColor=surface),shape=RoundedCornerShape(16.dp)) {
        Row(Modifier.fillMaxWidth().padding(horizontal=16.dp,vertical=14.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)) {
            Icon(icon,null,tint=Gold)
            Column(Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(3.dp)) { Text(title,color=text,fontWeight=FontWeight.SemiBold);Text(subtitle,color=muted,fontSize=12.sp) }
            Icon(Icons.Default.ChevronLeft,null,tint=muted)
        }
    }
}

@Composable
private fun ServiceCard(service:Service,ar:Boolean,text:Color,muted:Color,surface:Color,onClick:()->Unit) {
    Card(Modifier.fillMaxWidth().aspectRatio(1f).clickable(onClick=onClick),shape=RoundedCornerShape(18.dp),colors=CardDefaults.cardColors(containerColor=surface)) {
        Column(Modifier.fillMaxWidth().padding(horizontal=8.dp,vertical=12.dp),verticalArrangement=Arrangement.spacedBy(8.dp),horizontalAlignment=Alignment.CenterHorizontally) {
            Box(Modifier.size(46.dp).background(Teal.copy(alpha=.14f),RoundedCornerShape(14.dp)),contentAlignment=Alignment.Center){Icon(service.icon,null,tint=Gold)}
            Text(if(ar) service.ar else service.en,fontWeight=FontWeight.SemiBold,color=text,fontSize=if(ar) 11.sp else 12.sp,lineHeight=14.sp,maxLines=1,softWrap=false)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ServiceFormScreen(service:Service,ar:Boolean,text:Color,muted:Color,surface:Color,modifier:Modifier,onBack:()->Unit,onSend:(String,String)->Unit) {
    val groups=remember(service.key){fieldGroups(service.key)}
    var step by remember(service.key){mutableIntStateOf(0)}
    val values=remember(service.key){mutableStateMapOf<String,String>()}
    val current=groups.getOrNull(step)
    Column(modifier.fillMaxSize().padding(horizontal=16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)) {
        Row(Modifier.fillMaxWidth().padding(top=6.dp),verticalAlignment=Alignment.CenterVertically) {
            IconButton(onClick=onBack){Icon(Icons.Default.ArrowBack,null,tint=text)}
            Column(Modifier.weight(1f)){Text(if(ar) service.ar else service.en,fontSize=19.sp,fontWeight=FontWeight.Bold,color=text);Text(if(ar) "الخطوة ${step+1} من ${groups.size}" else "Step ${step+1} of ${groups.size}",color=muted,fontSize=12.sp)}
        }
        LinearProgressIndicator(progress={(step+1).toFloat()/groups.size},modifier=Modifier.fillMaxWidth(),color=Teal,trackColor=Gold.copy(alpha=.2f))
        Text(if(ar) "أكمل بيانات الرحلة وراجعها قبل الإرسال." else "Add your trip details and review them before sending.",color=muted,fontSize=13.sp)
        if(current!=null) Card(Modifier.weight(1f).fillMaxWidth(),colors=CardDefaults.cardColors(containerColor=surface),shape=RoundedCornerShape(24.dp)) {
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),verticalArrangement=Arrangement.spacedBy(14.dp)) {
                Text(if(ar) current.first else groupTitleEnglish(service.key,step),fontSize=19.sp,fontWeight=FontWeight.Bold,color=text)
                if (service.key == "flight" && step == 0) {
                    Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                        listOf("ذهاب فقط" to "One way", "ذهاب وعودة" to "Round trip").forEach { (arabic,english) ->
                            FilterChip(selected=values["trip"] == (if(ar) arabic else english),onClick={values["trip"]=if(ar) arabic else english},label={Text(if(ar) arabic else english)})
                        }
                    }
                }
                current.second.forEach { spec ->
                    if(service.key == "flight" && spec.key == "trip") return@forEach
                    if(spec.options.isNotEmpty()) {
                        var expanded by remember(spec.key){mutableStateOf(false)}
                        ExposedDropdownMenuBox(expanded=expanded,onExpandedChange={expanded=!expanded}) {
                            OutlinedTextField(value=values[spec.key].orEmpty(),onValueChange={},readOnly=true,label={Text(if(ar) spec.ar else spec.en)},placeholder={Text(if(ar) "اختر (اختياري)" else "Choose (optional)")},modifier=Modifier.fillMaxWidth().menuAnchor(),singleLine=true)
                            ExposedDropdownMenu(expanded=expanded,onDismissRequest={expanded=false}) {
                                spec.options.forEach { option -> DropdownMenuItem(text={Text(option)},onClick={values[spec.key]=option;expanded=false}) }
                            }
                        }
                    } else OutlinedTextField(value=values[spec.key].orEmpty(),onValueChange={values[spec.key]=it},label={Text(if(ar) spec.ar else spec.en)},placeholder={Text(if(ar) "اختياري" else "Optional")},modifier=Modifier.fillMaxWidth(),minLines=if(spec.multi) 3 else 1,maxLines=if(spec.multi) 5 else 1)
                }
            }
        }
        Row(Modifier.fillMaxWidth().padding(bottom=8.dp),horizontalArrangement=Arrangement.spacedBy(10.dp)) {
            if(step>0) OutlinedButton(onClick={step--},modifier=Modifier.weight(1f)){Text(if(ar) "السابق" else "Back")}
            if(step<groups.lastIndex) Button(onClick={step++},modifier=Modifier.weight(1f)){Text(if(ar) "التالي" else "Next")}
            else Button(onClick={
                val rows=groups.flatMap{it.second}.mapNotNull{spec->values[spec.key]?.takeIf{it.isNotBlank()}?.let{(if(ar) spec.ar else spec.en) to it}}
                val intro=if(ar) "مرحبًا فريق معك، أود الاستفسار عن ${service.ar}.\n" else "Hello MAAK team, I would like to enquire about ${service.en}.\n"
                val details=if(rows.isEmpty()) if(ar) "لا توجد تفاصيل محددة حتى الآن." else "No details specified yet." else rows.joinToString("\n"){"${it.first}: ${it.second}"}
                val note=if(ar) "\nهذا استفسار وليس حجزًا مؤكدًا. يرجى تأكيد الأسعار والتوافر." else "\nThis is an enquiry, not a confirmed booking. Please confirm prices and availability."
                val requestData=JSONObject().put("source","android_native")
                groups.flatMap{it.second}.forEach { field -> values[field.key]?.takeIf(String::isNotBlank)?.let { requestData.put(field.key,it) } }
                onSend(intro+details+note,requestData.toString())
            },modifier=Modifier.weight(1f),colors=ButtonDefaults.buttonColors(containerColor=Teal)){Icon(Icons.Default.Chat,null);Spacer(Modifier.width(6.dp));Text(if(ar) "إرسال عبر واتساب" else "Send via WhatsApp")}
        }
    }
}
private fun groupTitleEnglish(key:String,step:Int)=when(key){
    "flight"->listOf("Trip route","Travel details","Preferences")[step.coerceIn(0,2)]
    "hotel"->listOf("Accommodation location","Stay details")[step.coerceIn(0,1)]
    "car"->"Vehicle details";"bus"->"Route and travel";"security"->"Enquiry details";"umrah"->"Umrah trip";"medical"->"Medical travel details";"realEstate"->"Property and location"
    else->listOf("Your trip","Timing and budget","Services and details")[step.coerceIn(0,2)]
}
