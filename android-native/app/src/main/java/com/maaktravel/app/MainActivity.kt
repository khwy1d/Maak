package com.maaktravel.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.net.URLEncoder

private val Teal = Color(0xFF20B8A6)
private val Navy = Color(0xFF142C4E)
private val Gold = Color(0xFFF5B52E)
private val Pale = Color(0xFFF5F7FA)

private data class Service(val key: String, val ar: String, val en: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)
private val services = listOf(
    Service("flight", "حجز تذاكر الطيران", "Flight bookings", Icons.Default.Flight),
    Service("security", "الموافقات الأمنية لمصر", "Egypt security clearance", Icons.Default.VerifiedUser),
    Service("hotel", "حجوزات الفنادق", "Hotel reservations", Icons.Default.Hotel),
    Service("car", "تأجير السيارات", "Car rental", Icons.Default.DirectionsCar),
    Service("tourism", "السياحة والرحلات", "Tourism and trips", Icons.Default.Explore),
    Service("medical", "السفر العلاجي", "Medical travel", Icons.Default.LocalHospital),
    Service("umrah", "الحج والعمرة", "Hajj & Umrah", Icons.Default.Place),
    Service("bus", "حجز الباصات والنقل البري", "Bus & ground transport", Icons.Default.DirectionsBus),
    Service("realEstate", "الخدمات العقارية", "Real estate services", Icons.Default.Apartment)
)
private data class FieldSpec(val key:String,val ar:String,val en:String,val options:List<String> = emptyList(),val multi:Boolean=false)
private fun fieldGroups(key:String): List<Pair<String,List<FieldSpec>>> {
    fun f(k:String,a:String,e:String,o:List<String> = emptyList(),m:Boolean=false)=FieldSpec(k,a,e,o,m)
    fun o(vararg s:String)=s.toList()
    return when(key) {
        "flight" -> listOf(
            "مسار الرحلة" to listOf(f("trip","نوع الرحلة","Trip type",o("داخل اليمن / Within Yemen","دولية / International")),f("fromCountry","دولة المغادرة","Departure country"),f("fromCity","مدينة المغادرة","Departure city"),f("toCountry","دولة الوصول","Arrival country"),f("toCity","مدينة الوصول","Arrival city")),
            "تفاصيل السفر" to listOf(f("ticket","نوع التذكرة","Ticket type",o("ذهاب فقط / One way","ذهاب وعودة / Return")),f("date","تاريخ الذهاب","Departure date"),f("returnDate","تاريخ العودة","Return date"),f("passengers","عدد المسافرين","Passengers",o("1","2","3","4","5+"))),
            "التفضيلات" to listOf(f("airline","شركة الطيران المفضلة","Preferred airline",o("اليمنية / Yemenia","طيران عدن / FlyAden","أي شركة مناسبة / Any suitable airline")),f("notes","تفاصيل إضافية","Additional details",m=true))
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
    val ar=lang=="ar"; val bg=if(dark) Color(0xFF101B2A) else Pale
    val surface=if(dark) Color(0xFF1A2A3E) else Color.White
    val text=if(dark) Color(0xFFF2F5F9) else Navy
    val muted=if(dark) Color(0xFFB7C5D7) else Color(0xFF59697D)
    CompositionLocalProvider(LocalLayoutDirection provides if(ar) LayoutDirection.Rtl else LayoutDirection.Ltr) {
        MaterialTheme(colorScheme=if(dark) darkColorScheme(primary=Teal,secondary=Gold,background=bg,surface=surface,onSurface=text) else lightColorScheme(primary=Teal,secondary=Gold,background=bg,surface=surface,onSurface=text)) {
            Scaffold(containerColor=bg,bottomBar={
                if(selected==null) NavigationBar(containerColor=surface) {
                    NavigationBarItem(selected=tab=="home",onClick={tab="home"},icon={Icon(Icons.Default.Home,null)},label={Text(if(ar) "الرئيسية" else "Home")})
                    NavigationBarItem(selected=tab=="services",onClick={tab="services"},icon={Icon(Icons.Default.GridView,null)},label={Text(if(ar) "خدماتنا" else "Services")})
                    NavigationBarItem(selected=false,onClick={onWhatsApp(if(ar) "مرحبًا، أرغب في الاستفسار عن خدمات معك." else "Hello, I would like to enquire about MAAK services.")},icon={Icon(Icons.Default.Chat,null)},label={Text("WhatsApp")})
                    NavigationBarItem(selected=tab=="about",onClick={tab="about"},icon={Icon(Icons.Default.Info,null)},label={Text(if(ar) "عن معك" else "About")})
                }
            }) { padding ->
                when {
                    selected!=null -> ServiceFormScreen(selected!!,ar,text,muted,surface,Modifier.padding(padding),{selected=null},onWhatsApp)
                    tab=="services" -> ServicesScreen(ar,text,muted,surface,Modifier.padding(padding)){selected=it}
                    tab=="about" -> AboutScreen(ar,text,muted,surface,Modifier.padding(padding)){onWhatsApp(if(ar) "مرحبًا، أرغب في الاستفسار عن خدمات معك." else "Hello, I would like to enquire about MAAK services.")}
                    else -> HomeScreen(ar,text,muted,surface,Modifier.padding(padding),{tab="services"},{selected=it},{onWhatsApp(if(ar) "مرحبًا، أرغب في الاستفسار عن خدمات معك." else "Hello, I would like to enquire about MAAK services.")}, {lang=if(ar) "en" else "ar"}, {dark=!dark})
                }
            }
        }
    }
}

@Composable
private fun HomeScreen(ar:Boolean,text:Color,muted:Color,surface:Color,modifier:Modifier,onServices:()->Unit,onChoose:(Service)->Unit,onContact:()->Unit,onToggleLang:()->Unit,onToggleTheme:()->Unit) {
    LazyColumn(modifier.fillMaxSize(),contentPadding=PaddingValues(18.dp),verticalArrangement=Arrangement.spacedBy(14.dp)) {
        item { Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)) {
            Box(Modifier.size(50.dp).background(Teal,RoundedCornerShape(16.dp)),contentAlignment=Alignment.Center){Text("م",color=Color.White,fontSize=27.sp,fontWeight=FontWeight.Bold)}
            Column { Text(if(ar) "معك" else "MAAK",fontSize=26.sp,fontWeight=FontWeight.Bold,color=text);Text(if(ar) "دائمًا معك" else "Always with you",color=muted) }
            Spacer(Modifier.weight(1f))
            TextButton(onClick=onToggleLang){Text(if(ar) "English" else "العربية")}
            IconButton(onClick=onToggleTheme){Icon(if(ar) Icons.Default.DarkMode else Icons.Default.LightMode,null,tint=Gold)}
        } }
        item { Card(colors=CardDefaults.cardColors(containerColor=surface),shape=RoundedCornerShape(28.dp)) {
            Column(Modifier.padding(22.dp),verticalArrangement=Arrangement.spacedBy(14.dp)) {
                Text(if(ar) "رحلتك تبدأ بخطوة، ونحن معك في تفاصيلها." else "Your journey starts with one step, and we’re with you in every detail.",fontSize=25.sp,lineHeight=33.sp,fontWeight=FontWeight.Bold,color=text)
                Text(if(ar) "نصمّم رحلتك بعناية، ونرافقك في كل تفصيلة — من التخطيط إلى الوصول." else "We design your journey with care — from planning to arrival.",color=muted,fontSize=16.sp,lineHeight=25.sp)
                Button(onClick=onServices,modifier=Modifier.fillMaxWidth(),colors=ButtonDefaults.buttonColors(containerColor=Teal)){Text(if(ar) "عرض خدماتنا" else "Explore services",color=Color.White)}
                OutlinedButton(onClick=onContact,modifier=Modifier.fillMaxWidth()){Icon(Icons.Default.Chat,null);Spacer(Modifier.width(8.dp));Text(if(ar) "تواصل عبر واتساب" else "Chat on WhatsApp")}
            }
        } }
        item { Text(if(ar) "الخدمات الأكثر طلبًا" else "Popular services",fontSize=21.sp,fontWeight=FontWeight.Bold,color=text) }
        items(services.take(4)){ service -> ServiceCard(service,ar,text,muted,surface){onChoose(service)} }
        item { Text(if(ar) "جميع الطلبات استفسارات وليست حجوزات مؤكدة. تُراجع الأسعار والتوافر عبر التواصل المباشر." else "Requests are enquiries, not confirmed bookings. Prices and availability are confirmed directly.",color=muted,fontSize=13.sp,lineHeight=20.sp) }
    }
}

@Composable
private fun ServicesScreen(ar:Boolean,text:Color,muted:Color,surface:Color,modifier:Modifier,onChoose:(Service)->Unit) {
    LazyColumn(modifier.fillMaxSize(),contentPadding=PaddingValues(18.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
        item { Text(if(ar) "خدمات معك" else "MAAK services",fontSize=27.sp,fontWeight=FontWeight.Bold,color=text);Text(if(ar) "اختر الخدمة التي تحتاجها وابدأ الاستفسار." else "Choose a service to start an enquiry.",color=muted) }
        items(services){service->ServiceCard(service,ar,text,muted,surface){onChoose(service)}}
    }
}

@Composable
private fun ServiceCard(service:Service,ar:Boolean,text:Color,muted:Color,surface:Color,onClick:()->Unit) {
    Card(Modifier.fillMaxWidth().clickable(onClick=onClick),shape=RoundedCornerShape(22.dp),colors=CardDefaults.cardColors(containerColor=surface)) {
        Row(Modifier.padding(16.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(13.dp)) {
            Box(Modifier.size(46.dp).background(Teal.copy(alpha=.12f),CircleShape),contentAlignment=Alignment.Center){Icon(service.icon,null,tint=Teal)}
            Column(Modifier.weight(1f)){Text(if(ar) service.ar else service.en,fontWeight=FontWeight.SemiBold,color=text,fontSize=16.sp);Text(if(ar) service.en else service.ar,color=muted,fontSize=12.sp)}
            Icon(Icons.Default.ChevronLeft,null,tint=Gold)
        }
    }
}

@Composable
private fun AboutScreen(ar:Boolean,text:Color,muted:Color,surface:Color,modifier:Modifier,onContact:()->Unit) {
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),verticalArrangement=Arrangement.spacedBy(16.dp)) {
        Text(if(ar) "عن معك" else "About MAAK",fontSize=27.sp,fontWeight=FontWeight.Bold,color=text)
        Card(colors=CardDefaults.cardColors(containerColor=surface),shape=RoundedCornerShape(24.dp)){Column(Modifier.padding(20.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
            Text(if(ar) "دائمًا معك" else "Always with you",fontSize=22.sp,fontWeight=FontWeight.Bold,color=Gold)
            Text(if(ar) "معك علامة لخدمات السفر تهدف إلى جعل ترتيبات السفر أوضح وأسهل، وأن تكون نقطة تواصل قريبة تساعدك في كل خطوة." else "MAAK is a travel services brand focused on making travel arrangements clearer and easier, with a helpful point of contact at every step.",color=text,lineHeight=25.sp)
        }}
        Button(onClick=onContact,modifier=Modifier.fillMaxWidth()){Text(if(ar) "تواصل معنا" else "Contact us")}
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ServiceFormScreen(service:Service,ar:Boolean,text:Color,muted:Color,surface:Color,modifier:Modifier,onBack:()->Unit,onSend:(String)->Unit) {
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
        Text(if(ar) "كل التفاصيل اختيارية ويمكنك المتابعة دون تعبئة الحقول." else "All details are optional. You can continue without filling any field.",color=muted,fontSize=13.sp)
        if(current!=null) Card(Modifier.weight(1f).fillMaxWidth(),colors=CardDefaults.cardColors(containerColor=surface),shape=RoundedCornerShape(24.dp)) {
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),verticalArrangement=Arrangement.spacedBy(14.dp)) {
                Text(if(ar) current.first else groupTitleEnglish(service.key,step),fontSize=19.sp,fontWeight=FontWeight.Bold,color=text)
                current.second.forEach { spec ->
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
                onSend(intro+details+note)
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
