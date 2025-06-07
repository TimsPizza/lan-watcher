import React from "react";
// 临时图标组件，直到 React Icons 安装完成
const IconWrapper = ({
  children,
  className,
}: {
  children: string;
  className: string;
}) => (
  <div
    className={`${className} flex items-center justify-center rounded-full border bg-gray-100`}
  >
    <span className="text-xs font-semibold">{children}</span>
  </div>
);

// 临时图标映射
const MdRouter = ({ className }: { className: string }) => (
  <IconWrapper className={className}>路</IconWrapper>
);
const MdComputer = ({ className }: { className: string }) => (
  <IconWrapper className={className}>电</IconWrapper>
);
const MdTablet = ({ className }: { className: string }) => (
  <IconWrapper className={className}>板</IconWrapper>
);
const MdPhoneIphone = ({ className }: { className: string }) => (
  <IconWrapper className={className}>手</IconWrapper>
);
const MdTv = ({ className }: { className: string }) => (
  <IconWrapper className={className}>视</IconWrapper>
);
const MdWatch = ({ className }: { className: string }) => (
  <IconWrapper className={className}>表</IconWrapper>
);
const MdSecurity = ({ className }: { className: string }) => (
  <IconWrapper className={className}>监</IconWrapper>
);
const MdPrint = ({ className }: { className: string }) => (
  <IconWrapper className={className}>印</IconWrapper>
);
const MdSpeaker = ({ className }: { className: string }) => (
  <IconWrapper className={className}>音</IconWrapper>
);
const MdStorage = ({ className }: { className: string }) => (
  <IconWrapper className={className}>存</IconWrapper>
);
const MdDevicesOther = ({ className }: { className: string }) => (
  <IconWrapper className={className}>设</IconWrapper>
);

// 设备类型映射到图标
export const getDeviceIcon = (device: {
  device_type?: string | null;
  vendor?: string | null;
  hostname?: string | null;
  mac_address?: string | null;
}) => {
  const deviceType = device.device_type?.toLowerCase() || "";
  const vendor = device.vendor?.toLowerCase() || "";
  const hostname = device.hostname?.toLowerCase() || "";
  const macPrefix = device.mac_address?.substring(0, 8)?.toLowerCase() || "";

  // 根据设备类型判断
  if (deviceType.includes("router") || deviceType.includes("gateway")) {
    return <MdRouter className="h-8 w-8 text-blue-600" />;
  }

  if (deviceType.includes("phone") || deviceType.includes("mobile")) {
    return <MdPhoneIphone className="h-8 w-8 text-green-600" />;
  }

  if (deviceType.includes("tablet") || deviceType.includes("ipad")) {
    return <MdTablet className="h-8 w-8 text-purple-600" />;
  }

  if (deviceType.includes("tv") || deviceType.includes("television")) {
    return <MdTv className="h-8 w-8 text-red-600" />;
  }

  if (deviceType.includes("watch") || deviceType.includes("wearable")) {
    return <MdWatch className="h-8 w-8 text-orange-600" />;
  }

  if (deviceType.includes("camera") || deviceType.includes("security")) {
    return <MdSecurity className="h-8 w-8 text-yellow-600" />;
  }

  if (deviceType.includes("printer")) {
    return <MdPrint className="h-8 w-8 text-gray-600" />;
  }

  if (deviceType.includes("speaker") || deviceType.includes("audio")) {
    console.log("speaker");
    return <MdSpeaker className="h-8 w-8 text-indigo-600" />;
  }

  if (
    deviceType.includes("computer") ||
    deviceType.includes("pc") ||
    deviceType.includes("laptop")
  ) {
    return <MdComputer className="h-8 w-8 text-gray-700" />;
  }

  // 根据厂商名称判断
  if (vendor.includes("apple")) {
    if (hostname.includes("iphone"))
      return <MdPhoneIphone className="h-8 w-8 text-green-600" />;
    if (hostname.includes("ipad"))
      return <MdTablet className="h-8 w-8 text-purple-600" />;
    if (hostname.includes("watch"))
      return <MdWatch className="h-8 w-8 text-orange-600" />;
    if (hostname.includes("tv"))
      return <MdTv className="h-8 w-8 text-red-600" />;
    return <MdComputer className="h-8 w-8 text-gray-700" />;
  }

  if (
    vendor.includes("samsung") ||
    vendor.includes("huawei") ||
    vendor.includes("xiaomi") ||
    vendor.includes("oneplus")
  ) {
    if (hostname.includes("tablet"))
      return <MdTablet className="h-8 w-8 text-purple-600" />;
    if (hostname.includes("tv"))
      return <MdTv className="h-8 w-8 text-red-600" />;
    if (hostname.includes("watch"))
      return <MdWatch className="h-8 w-8 text-orange-600" />;
    return <MdPhoneIphone className="h-8 w-8 text-green-600" />;
  }

  if (
    vendor.includes("roku") ||
    vendor.includes("chromecast") ||
    (vendor.includes("amazon") && hostname.includes("fire"))
  ) {
    return <MdTv className="h-8 w-8 text-red-600" />;
  }

  if (
    vendor.includes("tp-link") ||
    vendor.includes("netgear") ||
    vendor.includes("linksys") ||
    vendor.includes("asus") ||
    vendor.includes("dlink")
  ) {
    return <MdRouter className="h-8 w-8 text-blue-600" />;
  }

  if (
    vendor.includes("canon") ||
    vendor.includes("hp") ||
    vendor.includes("epson") ||
    vendor.includes("brother")
  ) {
    return <MdPrint className="h-8 w-8 text-gray-600" />;
  }

  if (
    vendor.includes("synology") ||
    vendor.includes("qnap") ||
    vendor.includes("drobo")
  ) {
    return <MdStorage className="h-8 w-8 text-blue-500" />;
  }

  // 根据主机名判断
  if (hostname.includes("router") || hostname.includes("gateway")) {
    return <MdRouter className="h-8 w-8 text-blue-600" />;
  }

  if (hostname.includes("phone") || hostname.includes("android")) {
    return <MdPhoneIphone className="h-8 w-8 text-green-600" />;
  }

  if (hostname.includes("tablet") || hostname.includes("ipad")) {
    return <MdTablet className="h-8 w-8 text-purple-600" />;
  }

  if (
    hostname.includes("tv") ||
    hostname.includes("roku") ||
    hostname.includes("chromecast")
  ) {
    return <MdTv className="h-8 w-8 text-red-600" />;
  }

  if (hostname.includes("camera") || hostname.includes("security")) {
    return <MdSecurity className="h-8 w-8 text-yellow-600" />;
  }

  if (hostname.includes("printer")) {
    return <MdPrint className="h-8 w-8 text-gray-600" />;
  }

  if (hostname.includes("speaker") || hostname.includes("echo")) {
    return <MdSpeaker className="h-8 w-8 text-indigo-600" />;
  }

  // 默认图标
  return <MdDevicesOther className="h-8 w-8 text-gray-500" />;
};

// 获取设备类型标签
export const getDeviceTypeLabel = (device: {
  device_type?: string | null;
  vendor?: string | null;
  hostname?: string | null;
}) => {
  const deviceType = device.device_type?.toLowerCase() || "";
  const vendor = device.vendor?.toLowerCase() || "";
  const hostname = device.hostname?.toLowerCase() || "";

  if (
    deviceType.includes("router") ||
    deviceType.includes("gateway") ||
    hostname.includes("router")
  ) {
    return "路由器";
  }
  if (
    deviceType.includes("phone") ||
    deviceType.includes("mobile") ||
    hostname.includes("phone")
  ) {
    return "手机";
  }
  if (
    deviceType.includes("tablet") ||
    hostname.includes("tablet") ||
    hostname.includes("ipad")
  ) {
    return "平板";
  }
  if (deviceType.includes("tv") || hostname.includes("tv")) {
    return "电视";
  }
  if (deviceType.includes("watch") || hostname.includes("watch")) {
    return "智能手表";
  }
  if (
    deviceType.includes("camera") ||
    deviceType.includes("security") ||
    hostname.includes("camera")
  ) {
    return "监控设备";
  }
  if (deviceType.includes("printer") || hostname.includes("printer")) {
    return "打印机";
  }
  if (
    deviceType.includes("speaker") ||
    hostname.includes("speaker") ||
    hostname.includes("echo")
  ) {
    return "音响";
  }
  if (
    deviceType.includes("computer") ||
    deviceType.includes("pc") ||
    deviceType.includes("laptop")
  ) {
    return "电脑";
  }

  // 基于厂商推断
  if (vendor.includes("apple")) return "Apple设备";
  if (
    vendor.includes("samsung") ||
    vendor.includes("huawei") ||
    vendor.includes("xiaomi")
  )
    return "移动设备";
  if (
    vendor.includes("tp-link") ||
    vendor.includes("netgear") ||
    vendor.includes("linksys")
  )
    return "网络设备";

  return "未知设备";
};
