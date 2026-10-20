#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "Kismet/GameplayStatics.h"
#include "TGGEconomyRules.h"
#include "TGGDeliverySave.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTGGBusinessTransactionTest,
    "TGG.Business.TransactionRules",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTGGBusinessTransactionTest::RunTest(const FString& Parameters)
{
    int32 Cash = 100;
    int32 Day = 0;
    TestTrue(TEXT("Music venue costs 60"),
        TGGEconomyRules::PurchaseBalance(Cash, 60, false, Cash));
    TestEqual(TEXT("Cash after purchase"), Cash, 40);
    TestFalse(TEXT("Duplicate purchase refused"),
        TGGEconomyRules::PurchaseBalance(Cash, 60, true, Cash));
    TestTrue(TEXT("First day closes"),
        TGGEconomyRules::CloseBusinessDay(Cash, 10, Day, -1, Cash, Day));
    TestEqual(TEXT("One day of income"), Cash, 50);
    TestEqual(TEXT("Day counter advances"), Day, 1);
    TestFalse(TEXT("Same day cannot be paid again"),
        TGGEconomyRules::CollectAvailableDay(Cash, 10, Day, Day, Cash));
    TestFalse(TEXT("Negative prices refused"),
        TGGEconomyRules::PurchaseBalance(Cash, -10, false, Cash));
    TestEqual(TEXT("Refusals leave cash unchanged"), Cash, 50);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTGGBusinessSaveTest,
    "TGG.Business.SaveRoundTrip",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FTGGBusinessSaveTest::RunTest(const FString& Parameters)
{
    UTGGDeliverySave* Save = Cast<UTGGDeliverySave>(
        UGameplayStatics::CreateSaveGameObject(UTGGDeliverySave::StaticClass()));
    if (!TestNotNull(TEXT("Save object exists"), Save)) { return false; }
    Save->Stage = 2;
    Save->Cash = 50;
    Save->OwnedPropertyIDs.Add(FName(TEXT("MusicVenue")));
    Save->LastCollectedBusinessDay = 1;
    Save->CurrentBusinessDay = 1;
    TArray<uint8> Bytes;
    if (!TestTrue(TEXT("Serialize through Unreal SaveGame"),
        UGameplayStatics::SaveGameToMemory(Save, Bytes))) { return false; }
    UTGGDeliverySave* Loaded = Cast<UTGGDeliverySave>(
        UGameplayStatics::LoadGameFromMemory(Bytes));
    if (!TestNotNull(TEXT("Read save object"), Loaded)) { return false; }
    TestEqual(TEXT("Stage preserved"), Loaded->Stage, 2);
    TestEqual(TEXT("Cash preserved"), Loaded->Cash, 50);
    TestEqual(TEXT("Owned count preserved"), Loaded->OwnedPropertyIDs.Num(), 1);
    TestTrue(TEXT("Owned identity preserved"),
        Loaded->OwnedPropertyIDs.Contains(FName(TEXT("MusicVenue"))));
    TestEqual(TEXT("Last collection preserved"), Loaded->LastCollectedBusinessDay, 1);
    TestEqual(TEXT("World day preserved"), Loaded->CurrentBusinessDay, 1);
    return true;
}

#endif
