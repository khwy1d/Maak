package com.maaktravel.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val Teal=Color(0xFF20B8A6)
private val Navy=Color(0xFF142C4E)
private val Pale=Color(0xFFF5F7FA)
private val Line=Color(0xFFD9E2EC)
private val Gold=Color(0xFFF5B52E)
private data class Service(val title:String,val subtitle:String,val icon:ImageVector)
private val services=listOf(
 Service("تذاكر الطيران","احجز رحلتك بكل سهولة",Icons.Default.Flight),
 Service("الفنادق","إقامة تناسب رحلتك",Icons.Default.Hotel),
 Service("النقل البري","تنقل بين المدن براحة",Icons.Default.DirectionsBus),
 Service("تأجير السيارات","سيارتك جاهزة لرحلتك",Icons.Default.DirectionsCar),
 Service("الموافقات الأمنية لمصر","نساعدك في إجراءات السفر",Icons.Default.VerifiedUser),
 Service("العمرة","نسّق رحلة عمرتك معنا",Icons.Default.Place),
 Service("السفر العلاجي","نرافقك في رحلتك العلاجية",Icons.Default.LocalHospital)
)
class MainActivity:ComponentActivity(){
 override fun onCreate(savedInstanceState:Bundle?){super.onCreate(savedInstanceState);setContent{MaakApp()}}
}
@Composable private fun MaakApp(){
 var tab by remember{mutableIntStateOf(0)}
 var chosen by remember{mutableStateOf<Service?>(null)}
 var dark by remember{mutableStateOf(false)}
 val bg=if(dark)Color(0xFF101B2A) else Pale
 val surface=if(dark)Color(0xFF1A2A3E) else Color.White
 val ink=if(dark)Color(0xFFF2F5F9) else Navy
 val muted=if(dark)Color(0xFFB7C5D7) else Color(0xFF718096)
 MaterialTheme(colorScheme=if(dark)darkColorScheme(primary=Teal,secondary=Gold,background=bg,surface=surface,onSurface=ink) else lightColorScheme(primary=Teal,secondary=Gold,background=bg,surface=surface,onSurface=ink)){
  Scaffold(containerColor=bg,bottomBar={if(chosen==null)NavigationBar(containerColor=surface){
   val labels=listOf("الرئيسية","حجوزاتي","المكافآت","حسابي")
   val icons=listOf(Icons.Default.Home,Icons.Default.CalendarMonth,Icons.Default.CardGiftcard,Icons.Default.Person)
   labels.forEachIndexed{i,label->NavigationBarItem(selected=tab==i,onClick={tab=i},icon={Icon(icons[i],label)},label={Text(label,fontSize=11.sp)},colors=NavigationBarItemDefaults.colors(selectedIconColor=Teal,selectedTextColor=Teal,indicatorColor=Teal.copy(alpha=.12f),unselectedIconColor=muted))}
  }}){padding->
   if(chosen!=null) ServiceForm(chosen!!,ink,muted,surface,Modifier.padding(padding)){chosen=null}
   else when(tab){
    0->Home(ink,muted,surface,Modifier.padding(padding)){chosen=it}
    1->Orders(ink,muted,surface,Modifier.padding(padding))
    2->Rewards(ink,muted,surface,Modifier.padding(padding))
    else->Account(ink,muted,surface,dark,Modifier.padding(padding)){dark=!dark}
   }
  }
 }
}
@Composable private fun Header(title:String,ink:Color){
 Row(Modifier.fillMaxWidth().padding(horizontal=20.dp,vertical=12.dp),verticalAlignment=Alignment.CenterVertically){
  Text(title,fontSize=23.sp,fontWeight=FontWeight.Bold,color=ink,modifier=Modifier.weight(1f))
  IconButton(onClick={}){BadgedBox(badge={Badge(containerColor=Gold){}}){Icon(Icons.Default.NotificationsNone,"الإشعارات",tint=ink)}}
 }
}
@Composable private fun Home(ink:Color,muted:Color,surface:Color,modifier:Modifier,onService:(Service)->Unit){
 LazyColumn(modifier.fillMaxSize(),contentPadding=PaddingValues(bottom=20.dp),verticalArrangement=Arrangement.spacedBy(13.dp)){
  item{Row(Modifier.fillMaxWidth().padding(horizontal=20.dp,vertical=10.dp),verticalAlignment=Alignment.CenterVertically){
   Column(Modifier.weight(1f)){Text("مرحباً بك في معك",fontSize=18.sp,fontWeight=FontWeight.Bold,color=ink);Text("رحلتك أسهل معنا",fontSize=12.sp,color=muted)}
   Box(Modifier.size(42.dp).clip(CircleShape).background(surface).border(1.dp,Line,CircleShape),contentAlignment=Alignment.Center){Text("م",fontSize=23.sp,fontWeight=FontWeight.Bold,color=Teal)}
   IconButton(onClick={}){BadgedBox(badge={Badge(containerColor=Gold){}}){Icon(Icons.Default.NotificationsNone,null,tint=ink)}}
  }}
  item{Box(Modifier.fillMaxWidth().padding(horizontal=18.dp).height(142.dp).clip(RoundedCornerShape(22.dp)).background(Brush.linearGradient(listOf(Teal,Color(0xFF0876B8),Navy))).padding(18.dp)){
   Column(Modifier.align(Alignment.CenterStart)){Text("MAAK  |  معك",color=Color.White.copy(alpha=.85f),fontSize=12.sp);Spacer(Modifier.height(8.dp));Text("سفرك أسهل معنا",color=Color.White,fontSize=24.sp,fontWeight=FontWeight.Bold);Text("نرافقك في كل خطوة",color=Color.White,fontSize=13.sp)}
   Icon(Icons.Default.Flight,null,tint=Color.White.copy(alpha=.16f),modifier=Modifier.align(Alignment.CenterEnd).size(90.dp))
  }}
  item{Row(Modifier.fillMaxWidth().padding(horizontal=20.dp),verticalAlignment=Alignment.CenterVertically){Text("خدماتنا",fontSize=20.sp,fontWeight=FontWeight.Bold,color=ink);Spacer(Modifier.width(7.dp));Box(Modifier.width(28.dp).height(3.dp).background(Gold,CircleShape))}}
  items(services){s->ServiceRow(s,ink,muted,surface){onService(s)}}
  item{Column(Modifier.fillMaxWidth().padding(horizontal=18.dp).clip(RoundedCornerShape(20.dp)).background(surface).border(1.dp,Line,RoundedCornerShape(20.dp)).padding(15.dp),verticalArrangement=Arrangement.spacedBy(9.dp)){
   Row(verticalAlignment=Alignment.CenterVertically){Icon(Icons.Default.TrackChanges,null,tint=Teal);Spacer(Modifier.width(8.dp));Text("متابعة طلب سابق",fontWeight=FontWeight.Bold,color=ink,fontSize=17.sp)}
   Text("أدخل بيانات طلبك لمتابعة آخر التحديثات",color=muted,fontSize=12.sp)
   OutlinedTextField(value="",onValueChange={},modifier=Modifier.fillMaxWidth(),placeholder={Text("الرقم المرجعي")},singleLine=true)
   OutlinedTextField(value="",onValueChange={},modifier=Modifier.fillMaxWidth(),placeholder={Text("رقم الهاتف")},singleLine=true)
   Button(onClick={},modifier=Modifier.fillMaxWidth(),colors=ButtonDefaults.buttonColors(containerColor=Teal)){Text("تحقق ومتابعة",color=Color.White)}
  }}
 }
}
@Composable private fun ServiceRow(s:Service,ink:Color,muted:Color,surface:Color,onClick:()->Unit){
 Row(Modifier.fillMaxWidth().padding(horizontal=18.dp).clip(RoundedCornerShape(17.dp)).background(surface).border(1.dp,Line,RoundedCornerShape(17.dp)).clickable(onClick=onClick).padding(13.dp),verticalAlignment=Alignment.CenterVertically){
  Box(Modifier.size(48.dp).clip(RoundedCornerShape(14.dp)).background(Teal.copy(alpha=.11f)),contentAlignment=Alignment.Center){Icon(s.icon,null,tint=Teal,modifier=Modifier.size(25.dp))}
  Spacer(Modifier.width(13.dp));Column(Modifier.weight(1f)){Text(s.title,fontWeight=FontWeight.Bold,fontSize=15.sp,color=ink);Text(s.subtitle,fontSize=11.sp,color=muted)}
  Icon(Icons.Default.ChevronLeft,null,tint=Gold)
 }
}
@Composable private fun Orders(ink:Color,muted:Color,surface:Color,modifier:Modifier){
 var filter by remember{mutableStateOf("الكل")}
 val filters=listOf("الكل","النشطة","المكتملة","الملغاة")
 val names=listOf("حجز تذاكر الطيران","العمرة","حجز الفنادق","تأجير السيارات")
 val refs=listOf("MK-20481","MK-20376","MK-19842","MK-17653")
 val states=listOf("قيد المراجعة","بانتظار التأكيد","مكتمل","ملغي")
 val icons=listOf(Icons.Default.Flight,Icons.Default.Place,Icons.Default.Hotel,Icons.Default.DirectionsCar)
 Column(modifier.fillMaxSize()){
  Header("حجوزاتي",ink)
  Row(Modifier.fillMaxWidth().padding(horizontal=14.dp),horizontalArrangement=Arrangement.spacedBy(4.dp)){filters.forEach{FilterChip(filter==it,{filter=it},label={Text(it,fontSize=11.sp)},colors=FilterChipDefaults.filterChipColors(selectedContainerColor=Teal,selectedLabelColor=Color.White))}}
  LazyColumn(contentPadding=PaddingValues(18.dp),verticalArrangement=Arrangement.spacedBy(11.dp)){
   items(names.indices.filter{filter=="الكل"||(filter=="النشطة"&&it<2)||(filter=="المكتملة"&&it==2)||(filter=="الملغاة"&&it==3)}){i->
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(17.dp)).background(surface).border(1.dp,Line,RoundedCornerShape(17.dp)).padding(14.dp),verticalAlignment=Alignment.CenterVertically){
     Icon(icons[i],null,tint=Teal,modifier=Modifier.size(28.dp));Spacer(Modifier.width(12.dp))
     Column(Modifier.weight(1f)){Text(names[i],fontWeight=FontWeight.Bold,color=ink,fontSize=14.sp);Text(refs[i]+"  •  2025",color=muted,fontSize=11.sp);Text(states[i],color=if(i==3)Color(0xFFE57373) else Teal,fontSize=11.sp)}
     Icon(Icons.Default.ChevronLeft,null,tint=muted)
    }
   }
  }
 }
}
@Composable private fun Rewards(ink:Color,muted:Color,surface:Color,modifier:Modifier){
 LazyColumn(modifier.fillMaxSize(),contentPadding=PaddingValues(bottom=20.dp),verticalArrangement=Arrangement.spacedBy(14.dp)){
  item{Header("المكافآت",ink)}
  item{Column(Modifier.fillMaxWidth().padding(horizontal=18.dp).clip(RoundedCornerShape(22.dp)).background(Brush.linearGradient(listOf(Teal,Color(0xFF0876B8)))).padding(18.dp)){
   Text("رصيد المكافآت",color=Color.White,fontSize=13.sp);Text("—",color=Color.White,fontSize=32.sp,fontWeight=FontWeight.Bold);Text("يظهر الرصيد بعد تسجيل الدخول",color=Color.White,fontSize=11.sp)
   Row(horizontalArrangement=Arrangement.spacedBy(9.dp)){RewardMini("معلقة","—",surface);RewardMini("مكتسبة","—",surface)}
  }}
  item{Column(Modifier.fillMaxWidth().padding(horizontal=18.dp).clip(RoundedCornerShape(20.dp)).background(surface).border(1.dp,Line,RoundedCornerShape(20.dp)).padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
   Text("ادعُ أصدقاءك",fontWeight=FontWeight.Bold,color=ink,fontSize=17.sp);Text("شارك رمز الإحالة مع أصدقائك وعرّفهم بخدمات معك",color=muted,fontSize=12.sp)
   Text("رمز الدعوة يظهر بعد تسجيل الدخول",color=muted,fontSize=11.sp,modifier=Modifier.fillMaxWidth().background(Pale,RoundedCornerShape(10.dp)).padding(12.dp))
   Button(onClick={},modifier=Modifier.fillMaxWidth(),colors=ButtonDefaults.buttonColors(containerColor=Teal)){Icon(Icons.Default.Share,null);Spacer(Modifier.width(8.dp));Text("مشاركة رابط الدعوة")}
  }}
  item{Text("سجل المكافآت",fontSize=18.sp,fontWeight=FontWeight.Bold,color=ink,modifier=Modifier.padding(horizontal=20.dp))}
  item{EmptyState("لا توجد حركات لعرضها حالياً",muted)}
 }
}
@Composable private fun RewardMini(label:String,value:String,surface:Color){
 Row(Modifier.fillMaxWidth(.49f).clip(RoundedCornerShape(11.dp)).background(surface).padding(11.dp)){Column{Text(label,fontSize=11.sp,color=Navy);Text(value,fontSize=16.sp,color=Teal,fontWeight=FontWeight.Bold)}}
}
@Composable private fun Account(ink:Color,muted:Color,surface:Color,dark:Boolean,modifier:Modifier,onTheme:()->Unit){
 LazyColumn(modifier.fillMaxSize(),contentPadding=PaddingValues(bottom=18.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
  item{Header("حسابي",ink)}
  item{Column(Modifier.fillMaxWidth().padding(horizontal=18.dp).clip(RoundedCornerShape(20.dp)).background(surface).border(1.dp,Line,RoundedCornerShape(20.dp)).padding(17.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(8.dp)){
   Box(Modifier.size(76.dp).clip(CircleShape).background(Teal.copy(alpha=.12f)),contentAlignment=Alignment.Center){Icon(Icons.Default.Person,null,tint=Teal,modifier=Modifier.size(42.dp))}
   Text("الملف الشخصي",fontSize=18.sp,fontWeight=FontWeight.Bold,color=ink);Text("سجّل الدخول لعرض بيانات حسابك",fontSize=12.sp,color=muted)
   Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){AccountInfo("رقم الحساب","—",ink,muted);AccountInfo("كود الدعوة","—",ink,muted)}
  }}
  item{SectionTitle("حسابي")}
  item{AccountOption(Icons.Default.Person,"الملف الشخصي",ink,surface)}
  item{AccountOption(Icons.Default.Settings,"إعدادات الحساب",ink,surface)}
  item{AccountOption(Icons.Default.Description,"وثائقي",ink,surface)}
  item{SectionTitle("التطبيق")}
  item{AccountOption(Icons.Default.Language,"اللغة  •  العربية",ink,surface)}
  item{Row(Modifier.fillMaxWidth().padding(horizontal=18.dp).clip(RoundedCornerShape(14.dp)).background(surface).clickable(onClick=onTheme).padding(15.dp),verticalAlignment=Alignment.CenterVertically){Icon(Icons.Default.DarkMode,null,tint=Gold);Spacer(Modifier.width(12.dp));Text("المظهر",color=ink,modifier=Modifier.weight(1f));Text(if(dark)"داكن" else "فاتح",color=muted);Icon(Icons.Default.ChevronLeft,null,tint=muted)}}
  item{AccountOption(Icons.Default.NotificationsNone,"إعدادات الإشعارات",ink,surface)}
  item{AccountOption(Icons.Default.PrivacyTip,"الخصوصية والشروط",ink,surface)}
  item{AccountOption(Icons.Default.Info,"عن معك",ink,surface)}
  item{Row(Modifier.fillMaxWidth().padding(horizontal=18.dp).clip(RoundedCornerShape(13.dp)).background(Color(0xFFFFEEEE)).clickable{}.padding(15.dp),verticalAlignment=Alignment.CenterVertically){Icon(Icons.Default.Logout,null,tint=Color(0xFFC56B6B));Spacer(Modifier.width(12.dp));Text("تسجيل الخروج",color=Color(0xFFC56B6B),fontWeight=FontWeight.SemiBold)}}
 }
}
@Composable private fun SectionTitle(title:String){Text(title,fontSize=17.sp,fontWeight=FontWeight.Bold,color=Teal,modifier=Modifier.padding(horizontal=20.dp))}
@Composable private fun AccountInfo(label:String,value:String,ink:Color,muted:Color){Column(Modifier.clip(RoundedCornerShape(11.dp)).background(Pale).padding(11.dp)){Text(label,fontSize=10.sp,color=muted);Text(value,fontSize=13.sp,color=ink,fontWeight=FontWeight.Bold)}}
@Composable private fun AccountOption(icon:ImageVector,label:String,ink:Color,surface:Color){
 Row(Modifier.fillMaxWidth().padding(horizontal=18.dp).clip(RoundedCornerShape(13.dp)).background(surface).border(1.dp,Line,RoundedCornerShape(13.dp)).clickable{}.padding(14.dp),verticalAlignment=Alignment.CenterVertically){Icon(icon,null,tint=Gold);Spacer(Modifier.width(12.dp));Text(label,color=ink,fontSize=14.sp,modifier=Modifier.weight(1f));Icon(Icons.Default.ChevronLeft,null,tint=Teal)}
}
@Composable private fun EmptyState(message:String,muted:Color){Column(Modifier.fillMaxWidth().padding(28.dp),horizontalAlignment=Alignment.CenterHorizontally){Icon(Icons.Default.ReceiptLong,null,tint=muted,modifier=Modifier.size(38.dp));Text(message,color=muted,fontSize=13.sp,textAlign=TextAlign.Center)}}
@Composable private fun ServiceForm(service:Service,ink:Color,muted:Color,surface:Color,modifier:Modifier,onBack:()->Unit){
 Column(modifier.fillMaxSize().padding(20.dp),verticalArrangement=Arrangement.spacedBy(15.dp)){
  Row(verticalAlignment=Alignment.CenterVertically){IconButton(onClick=onBack){Icon(Icons.Default.ArrowForward,null,tint=ink)};Text(service.title,fontSize=20.sp,fontWeight=FontWeight.Bold,color=ink)}
  LinearProgressIndicator(progress={.35f},modifier=Modifier.fillMaxWidth(),color=Teal)
  Column(Modifier.weight(1f).fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(surface).padding(17.dp),verticalArrangement=Arrangement.spacedBy(13.dp)){
   Text("طلب "+service.title,fontSize=18.sp,fontWeight=FontWeight.Bold,color=ink);Text("سنساعدك في تنسيق طلبك. أكمل بياناتك للمتابعة.",fontSize=12.sp,color=muted)
   OutlinedTextField(value="",onValueChange={},label={Text("الاسم الكامل")},modifier=Modifier.fillMaxWidth())
   OutlinedTextField(value="",onValueChange={},label={Text("رقم الهاتف")},modifier=Modifier.fillMaxWidth())
   OutlinedTextField(value="",onValueChange={},label={Text("تفاصيل الطلب")},modifier=Modifier.fillMaxWidth(),minLines=4)
   Text("سيتم إرسال الطلب للمراجعة، ولا يُعد حجزاً مؤكداً.",fontSize=11.sp,color=muted)
  }
  Button(onClick={},modifier=Modifier.fillMaxWidth().height(50.dp),colors=ButtonDefaults.buttonColors(containerColor=Teal)){Text("مراجعة الطلب",color=Color.White)}
 }
}
